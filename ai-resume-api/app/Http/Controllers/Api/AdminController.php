<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MockInterview;
use App\Models\Resume;
use App\Models\Job;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class AdminController extends Controller
{
    public function jobs()
    {
        return response()->json(Job::query()->orderBy('title')->get());
    }

    public function storeJob(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'employment_type' => 'required|string|max:100',
            'description' => 'required|string|max:10000',
            'required_skills' => 'required|array|min:1|max:30',
            'required_skills.*' => 'required|string|max:100',
        ]);

        $data['required_skills'] = array_values(array_unique(array_map('trim', $data['required_skills'])));
        $job = Job::create($data);

        return response()->json($job, 201);
    }

    public function resumes(Request $request)
    {
        // Basic admin guard: you can extend this to real RBAC
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Resume::with(['resumeAnalyses', 'user']);

        if ($q = $request->query('q')) {
            $query->where('filename', 'like', "%{$q}%")
                  ->orWhereHas('user', function ($q2) use ($q) {
                      $q2->where('name', 'like', "%{$q}%");
                  });
        }

        $perPage = (int) $request->query('per_page', 20);
        $resumes = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return response()->json($resumes);
    }

    public function show(Resume $resume, Request $request)
    {
        $resume->load('resumeAnalyses');
        return response()->json($resume);
    }

    public function interviews(Request $request)
    {
        $query = MockInterview::with(['application.user', 'application.job', 'application.resume'])
            ->latest();

        if ($request->query('status') === 'pending') {
            $query->whereNull('review_decision');
        }

        $interviews = $query->paginate(25);
        $interviews->getCollection()->transform(fn (MockInterview $interview) => [
            'id' => $interview->id,
            'status' => $interview->status,
            'review_decision' => $interview->review_decision,
            'score' => $interview->report['overall_score'] ?? null,
            'applicant' => $interview->application->user->name,
            'job_title' => $interview->application->job->title,
            'company' => $interview->application->job->company,
            'created_at' => $interview->created_at,
        ]);

        return response()->json($interviews);
    }

    public function interview(MockInterview $interview)
    {
        $interview->load(['application.user', 'application.job', 'application.resume']);
        $audioUrls = [];
        foreach ($interview->audio_paths ?? [] as $questionIndex => $path) {
            $audioUrls[(string) $questionIndex] = URL::temporarySignedRoute(
                'admin.mock-interviews.audio',
                now()->addMinutes(10),
                ['interview' => $interview->id, 'questionIndex' => $questionIndex],
                false,
            );
        }

        return response()->json([
            'id' => $interview->id,
            'status' => $interview->status,
            'questions' => $interview->questions ?? [],
            'answers' => $interview->answers ?? [],
            'evaluations' => $interview->evaluations ?? [],
            'report' => $interview->report,
            'audio_urls' => $audioUrls,
            'review_decision' => $interview->review_decision,
            'review_note' => $interview->review_note,
            'reviewed_at' => $interview->reviewed_at,
            'applicant' => [
                'id' => $interview->application->user->id,
                'name' => $interview->application->user->name,
                'email' => $interview->application->user->email,
            ],
            'job' => [
                'title' => $interview->application->job->title,
                'company' => $interview->application->job->company,
            ],
            'resume' => [
                'id' => $interview->application->resume->id,
                'filename' => $interview->application->resume->filename,
            ],
        ]);
    }

    public function interviewAudio(MockInterview $interview, int $questionIndex)
    {
        $path = ($interview->audio_paths ?? [])[(string) $questionIndex] ?? null;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, basename($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function decideInterview(Request $request, MockInterview $interview)
    {
        if ($interview->status !== 'completed') {
            return response()->json(['message' => 'The applicant must complete the mock interview before HR review.'], 422);
        }

        $data = $request->validate([
            'decision' => 'required|in:passed,rejected',
            'note' => 'nullable|string|max:3000',
        ]);

        $interview->update([
            'review_decision' => $data['decision'],
            'review_note' => $data['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $interview->application()->update([
            'status' => $data['decision'] === 'passed' ? 'admin_passed' : 'admin_rejected',
        ]);

        return response()->json([
            'review_decision' => $interview->review_decision,
            'review_note' => $interview->review_note,
            'reviewed_at' => $interview->reviewed_at,
        ]);
    }
}
