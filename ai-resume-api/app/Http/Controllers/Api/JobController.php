<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Job;
use App\Models\MockInterview;
use App\Models\Resume;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class JobController extends Controller
{
    public function recommendations(Request $request, OpenAIService $ai)
    {
        $data = $request->validate(['resume_id' => 'required|integer|exists:resumes,id']);
        $resume = Resume::where('user_id', $request->user()->id)->findOrFail($data['resume_id']);
        $analysis = $resume->resumeAnalyses()->latest()->first();
        if (! $analysis || $analysis->verification_status !== 'completed' || (int) $analysis->verification_score < 75) {
            return response()->json(['message' => 'Pass skill verification with a score of at least 75 to view job recommendations.'], 403);
        }

        $verifiedSkills = $analysis->verified_skills ?? [];
        if (count($verifiedSkills) === 0) {
            $result = $ai->identifyVerifiedSkills(
                $resume->text ?? '',
                $analysis->verification_questions ?? [],
                $analysis->applicant_answers ?? [],
            );
            if (! empty($result['error'])) {
                return response()->json(['message' => $result['error']], 502);
            }
            $verifiedSkills = $result['verified_skills'];
            $analysis->update(['verified_skills' => $verifiedSkills]);
        }

        $jobs = Job::query()->orderBy('title')->get()->map(function (Job $job) use ($verifiedSkills, $request, $resume) {
            $matchedSkills = array_values(array_filter($job->required_skills ?? [], fn ($required) => $this->hasSkill($verifiedSkills, $required)));
            if (count($matchedSkills) === 0) {
                return null;
            }

            $application = Application::where('user_id', $request->user()->id)
                ->where('resume_id', $resume->id)
                ->where('job_id', $job->id)
                ->with(['mockInterviews' => fn ($query) => $query->latest()->limit(1)])
                ->first();

            return [
                'id' => $job->id,
                'title' => $job->title,
                'company' => $job->company,
                'location' => $job->location,
                'employment_type' => $job->employment_type,
                'description' => $job->description,
                'required_skills' => $job->required_skills,
                'matched_skills' => $matchedSkills,
                'match_score' => (int) round(count($matchedSkills) / max(1, count($job->required_skills)) * 100),
                'application' => $application ? [
                    'id' => $application->id,
                    'status' => $application->status,
                    'mock_interviews' => $application->mockInterviews->map(fn (MockInterview $interview) => [
                        'id' => $interview->id,
                        'status' => $interview->status,
                    ])->values(),
                ] : null,
            ];
        })->filter()->sortByDesc('match_score')->values();

        return response()->json(['verified_skills' => array_values($verifiedSkills), 'jobs' => $jobs]);
    }

    public function apply(Request $request)
    {
        $data = $request->validate([
            'resume_id' => 'required|integer|exists:resumes,id',
            'job_id' => 'required|integer|exists:job_listings,id',
        ]);
        $resume = Resume::where('user_id', $request->user()->id)->findOrFail($data['resume_id']);
        $analysis = $resume->resumeAnalyses()->latest()->first();
        if (! $analysis || $analysis->verification_status !== 'completed' || (int) $analysis->verification_score < 75) {
            return response()->json(['message' => 'Pass skill verification before applying to a job.'], 403);
        }

        $job = Job::findOrFail($data['job_id']);
        $skills = $analysis->verified_skills ?? [];
        $matched = array_filter($job->required_skills ?? [], fn ($required) => $this->hasSkill($skills, $required));
        if (count($matched) === 0) {
            return response()->json(['message' => 'This job does not match any skills verified by your assessment.'], 422);
        }

        $application = Application::firstOrCreate(
            ['user_id' => $request->user()->id, 'resume_id' => $resume->id, 'job_id' => $job->id],
            ['status' => 'submitted'],
        );

        return response()->json($application->load('job'), $application->wasRecentlyCreated ? 201 : 200);
    }

    public function applicantUpdates(Request $request)
    {
        $applications = Application::query()
            ->where('user_id', $request->user()->id)
            ->with('job:id,title,company')
            ->orderByDesc('id')
            ->get();

        $latestInterviewIds = MockInterview::query()
            ->selectRaw('MAX(id)')
            ->whereIn('application_id', $applications->pluck('id'))
            ->groupBy('application_id');
        $interviews = MockInterview::query()
            ->whereIn('id', $latestInterviewIds)
            ->get()
            ->keyBy('application_id');

        return response()->json($applications->map(function (Application $application) use ($interviews) {
            $interview = $interviews->get($application->id);

            return [
                'id' => $application->id,
                'status' => $application->status,
                'created_at' => $application->created_at,
                'job' => [
                    'title' => $application->job->title,
                    'company' => $application->job->company,
                ],
                'interview' => $interview ? [
                    'status' => $interview->status,
                    'review_decision' => $interview->review_decision,
                    'review_note' => $interview->review_note,
                    'reviewed_at' => $interview->reviewed_at,
                ] : null,
            ];
        })->values());
    }

    public function startInterview(Request $request, Application $application, OpenAIService $ai)
    {
        if ($application->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $existing = $application->mockInterviews()->where('status', 'in_progress')->latest()->first();
        if ($existing) {
            return response()->json($this->applicantInterviewPayload($existing->load('application.job')));
        }

        $resume = $application->resume;
        $analysis = $resume->resumeAnalyses()->latest()->first();
        if (! $analysis || $analysis->verification_status !== 'completed' || (int) $analysis->verification_score < 75) {
            return response()->json(['message' => 'A passing skill verification is required before starting a mock interview.'], 403);
        }

        $verifiedSkills = $analysis->verified_skills ?? [];
        if (count($verifiedSkills) === 0) {
            return response()->json(['message' => 'No skills were confirmed in the assessment answers. Retake the assessment to verify skills before starting an interview.'], 422);
        }
        $generated = $ai->generateMockInterview($resume->text ?? '', $verifiedSkills, $application->job->toArray());
        if (! empty($generated['error'])) {
            return response()->json(['message' => $generated['error']], 502);
        }

        $interview = $application->mockInterviews()->create([
            'questions' => $generated['questions'],
            'answers' => [],
            'evaluations' => [],
            'status' => 'in_progress',
        ]);

        return response()->json($this->applicantInterviewPayload($interview->load('application.job')), 201);
    }

    public function showInterview(Request $request, MockInterview $interview)
    {
        if ($interview->application()->value('user_id') !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($this->applicantInterviewPayload($interview->load('application.job')));
    }

    public function transcribeAnswer(Request $request, MockInterview $interview, OpenAIService $ai)
    {
        if ($interview->application()->value('user_id') !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($interview->status === 'completed') {
            return response()->json(['message' => 'This interview has already been completed.'], 409);
        }

        $data = $request->validate([
            'question_index' => 'required|integer|min:0',
            'audio' => 'required|file|max:25600',
        ]);
        if (! in_array(strtolower($data['audio']->getClientOriginalExtension()), ['webm', 'm4a', 'mp4', 'wav', 'mp3', 'ogg'], true)) {
            return response()->json(['message' => 'Use a supported audio recording format.'], 422);
        }
        $questionIndex = (int) $data['question_index'];
        if ($questionIndex !== count($interview->answers ?? []) || $questionIndex >= count($interview->questions ?? [])) {
            return response()->json(['message' => 'Record an answer for the current interview question.'], 422);
        }

        $extension = strtolower($data['audio']->getClientOriginalExtension());
        $path = "interview-audio/{$interview->id}/question-{$questionIndex}.{$extension}";
        if (! Storage::disk('local')->putFileAs("interview-audio/{$interview->id}", $data['audio'], "question-{$questionIndex}.{$extension}")) {
            return response()->json(['message' => 'The voice recording could not be saved. Please record your answer again.'], 500);
        }
        $audioPaths = $interview->audio_paths ?? [];
        $audioPaths[(string) $questionIndex] = $path;
        $interview->update(['audio_paths' => $audioPaths]);

        $result = $ai->transcribeInterviewAudio($data['audio']);
        if (! empty($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status'] ?? 502);
        }

        return response()->json(['transcript' => $result['transcript']]);
    }

    public function answer(Request $request, MockInterview $interview, OpenAIService $ai)
    {
        if ($interview->application()->value('user_id') !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($interview->status === 'completed') {
            return response()->json(['message' => 'This interview has already been completed.'], 409);
        }

        $data = $request->validate([
            'question_index' => 'required|integer|min:0',
            'answer' => 'required|string|max:8000',
        ]);
        $answers = $interview->answers ?? [];
        $evaluations = $interview->evaluations ?? [];
        $index = $data['question_index'];
        if ($index > count($answers) || $index >= count($interview->questions)) {
            return response()->json(['message' => 'Answer the interview questions in order.'], 422);
        }

        $evaluation = $ai->evaluateInterviewAnswer($interview->questions[$index], $data['answer']);
        if (! empty($evaluation['error'])) {
            return response()->json(['message' => $evaluation['error']], 502);
        }

        $answers[$index] = $data['answer'];
        $evaluations[$index] = $evaluation;
        $interview->update(['answers' => $answers, 'evaluations' => $evaluations]);

        if (count($answers) === count($interview->questions)) {
            $reportResult = $this->buildReport($interview->fresh(), $ai);
            if (! empty($reportResult['error'])) {
                return response()->json(['message' => $reportResult['error'], 'report_pending' => true], 502);
            }

            return response()->json([
                'interview' => $this->applicantInterviewPayload($interview->fresh()->load('application.job')),
            ]);
        }

        return response()->json([
            'interview' => $this->applicantInterviewPayload($interview->fresh()->load('application.job')),
            'next_question_index' => count($answers),
        ]);
    }

    public function report(Request $request, MockInterview $interview, OpenAIService $ai)
    {
        if ($interview->application()->value('user_id') !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (count($interview->answers ?? []) !== count($interview->questions ?? [])) {
            return response()->json(['message' => 'Complete all interview questions before generating the report.'], 422);
        }
        if ($interview->report) {
            return response()->json(['status' => 'completed', 'message' => 'Interview submitted for review.']);
        }

        $result = $this->buildReport($interview, $ai);
        if (! empty($result['error'])) {
            return response()->json(['message' => $result['error'], 'report_pending' => true], 502);
        }

        return response()->json(['status' => 'completed', 'message' => 'Interview submitted for review.']);
    }

    private function buildReport(MockInterview $interview, OpenAIService $ai)
    {
        $job = $interview->application->job;
        $result = $ai->summarizeMockInterview($interview->questions, $interview->answers ?? [], $interview->evaluations ?? [], $job->toArray());
        if (! empty($result['error'])) {
            return ['error' => $result['error']];
        }

        $interview->update(['report' => $result['report'], 'status' => 'completed']);
        return ['report' => $result['report']];
    }

    private function applicantInterviewPayload(MockInterview $interview): array
    {
        return [
            'id' => $interview->id,
            'status' => $interview->status,
            'questions' => $interview->questions ?? [],
            'answers' => $interview->answers ?? [],
            'application' => [
                'id' => $interview->application?->id,
                'job' => $interview->application?->job ? [
                    'title' => $interview->application->job->title,
                    'company' => $interview->application->job->company,
                ] : null,
            ],
        ];
    }

    private function hasSkill(array $verifiedSkills, string $requiredSkill): bool
    {
        foreach ($verifiedSkills as $skill) {
            if (mb_strtolower(trim((string) $skill)) === mb_strtolower(trim($requiredSkill))) {
                return true;
            }
        }
        return false;
    }
}