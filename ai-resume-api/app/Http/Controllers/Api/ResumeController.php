<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use Illuminate\Http\Request;
use App\Services\OpenAIService;
use App\Services\ResumeDocumentValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ResumeController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Resume::where('user_id', $request->user()->id)
                ->with('resumeAnalyses')
                ->latest('id')
                ->limit(1)
                ->get()
        );
    }

    public function upload(Request $request, ResumeDocumentValidator $documentValidator)
    {
        if ($request->user()->isAdmin() || $request->user()->is_hr) {
            return response()->json(['message' => 'Staff accounts cannot upload resumes.'], 403);
        }

        $file = $this->validatedResumeFile($request, $documentValidator);
        $resume = DB::transaction(function () use ($request, $file) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();

            if (Resume::where('user_id', $request->user()->id)->exists()) {
                return null;
            }

            $path = $file->store('resumes');

            return Resume::create([
                'user_id' => $request->user()->id,
                'filename' => $file->getClientOriginalName(),
                'path' => $path,
                'status' => 'uploaded',
            ]);
        });

        if (! $resume) {
            return response()->json([
                'message' => 'You already submitted a resume. Replace your current resume instead.',
            ], 409);
        }

        return response()->json($resume, 201);
    }

    public function replace(Request $request, Resume $resume, ResumeDocumentValidator $documentValidator)
    {
        if ($request->user()->isAdmin() || $request->user()->is_hr) {
            return response()->json(['message' => 'Staff accounts cannot upload resumes.'], 403);
        }

        if ($resume->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $file = $this->validatedResumeFile($request, $documentValidator);
        $previousPath = null;

        $resume = DB::transaction(function () use ($request, $resume, $file, &$previousPath) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $lockedResume = Resume::where('user_id', $request->user()->id)
                ->whereKey($resume->id)
                ->lockForUpdate()
                ->firstOrFail();
            $previousPath = $lockedResume->path;
            $newPath = $file->store('resumes');

            $lockedResume->resumeAnalyses()->delete();
            $lockedResume->update([
                'filename' => $file->getClientOriginalName(),
                'path' => $newPath,
                'text' => null,
                'status' => 'uploaded',
            ]);

            return $lockedResume->fresh();
        });

        if ($previousPath && ! Storage::delete($previousPath)) {
            Log::warning('Could not remove replaced resume file', [
                'resume_id' => $resume->id,
                'path' => $previousPath,
            ]);
        }

        return response()->json($resume);
    }

    private function validatedResumeFile(Request $request, ResumeDocumentValidator $documentValidator): UploadedFile
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|extensions:pdf|max:10240',
        ]);

        $file = $request->file('file');
        $rejectionReason = $documentValidator->rejectionReason($file);
        if ($rejectionReason !== null) {
            throw ValidationException::withMessages(['file' => [$rejectionReason]]);
        }

        return $file;
    }

    public function analyze(Request $request, Resume $resume, OpenAIService $ai)
    {
        // basic authorization
        if ($resume->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // dispatch analysis job
        $job = new \App\Jobs\ProcessResumeAnalysis($resume->id, $resume->path);
        dispatch($job);

        return response()->json(['message' => 'Analysis queued'], 202);
    }

    public function show(Resume $resume, Request $request)
    {
        if ($resume->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($resume->load('resumeAnalyses'));
    }

    public function verify(Request $request, Resume $resume, OpenAIService $ai)
    {
        if ($resume->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*' => 'required|string|max:5000',
        ]);
        $analysis = $resume->resumeAnalyses()->latest()->first();
        $questionCount = count($analysis?->verification_questions ?? []);
        if (! $analysis || $questionCount < 1 || count($data['answers']) !== $questionCount) {
            return response()->json(['message' => 'The generated question set is not ready or the answer count does not match.'], 422);
        }

        $analysis->update([
            'applicant_answers' => $data['answers'],
            'verification_status' => 'evaluating',
        ]);

        $result = $ai->evaluateVerification($resume->text ?? '', $analysis->verification_questions, $data['answers']);
        if (! empty($result['error'])) {
            $analysis->update(['verification_status' => 'evaluation_failed']);
            return response()->json(['message' => $result['error']], $result['status'] ?? 502);
        }

        if (! isset($result['verification_score']) || ! is_numeric($result['verification_score'])) {
            $analysis->update(['verification_status' => 'evaluation_failed']);
            return response()->json(['message' => 'AI could not produce a valid assessment score. Please retry evaluation.'], 502);
        }

        $score = max(0, min(100, (int) $result['verification_score']));
        $weakTopics = is_array($result['weak_topics'] ?? null) ? $result['weak_topics'] : [];

        $analysis->update([
            'verification_score' => $score,
            'verification_feedback' => $result['verification_feedback'] ?? null,
            'verification_weak_topics' => $weakTopics,
            'personalized_reviewer' => null,
            'verified_skills' => is_array($result['verified_skills'] ?? null) ? $result['verified_skills'] : [],
            'verification_status' => 'completed',
        ]);

        return response()->json($analysis->fresh());
    }

    public function reviewer(Request $request, Resume $resume, OpenAIService $ai)
    {
        if ($resume->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $analysis = $resume->resumeAnalyses()->latest()->first();
        if (! $analysis || $analysis->verification_score === null || $analysis->verification_score >= 75) {
            return response()->json(['message' => 'A failed verification assessment is required to generate a reviewer.'], 422);
        }

        if (is_array($analysis->personalized_reviewer) && ! empty($analysis->personalized_reviewer['topics'])) {
            return response()->json(['personalized_reviewer' => $analysis->personalized_reviewer]);
        }

        $result = $ai->generatePersonalizedReviewer(
            $resume->text ?? '',
            $analysis->verification_questions ?? [],
            $analysis->applicant_answers ?? [],
            $analysis->verification_weak_topics ?? [],
            $analysis->verification_feedback,
        );
        if (! empty($result['error'])) {
            return response()->json(['message' => $result['error']], 502);
        }

        $analysis->update(['personalized_reviewer' => $result['reviewer']]);

        return response()->json(['personalized_reviewer' => $result['reviewer']]);
    }
}
