<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Job;
use App\Models\Resume;
use App\Models\Role;
use App\Models\User;
use App\Services\OpenAIService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class JobInterviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_recommendations_require_a_pass_and_match_verified_skills(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'text' => 'PHP Laravel MySQL developer']);
        $job = Job::create([
            'title' => 'Junior Laravel Developer',
            'company' => 'Northstar Digital',
            'description' => 'Build API features.',
            'required_skills' => ['PHP', 'Laravel', 'MySQL'],
        ]);
        $resume->resumeAnalyses()->create([
            'verification_status' => 'completed',
            'verification_score' => 80,
            'verified_skills' => ['PHP', 'Laravel'],
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/jobs/recommendations?resume_id={$resume->id}");

        $response->assertOk()
            ->assertJsonPath('verified_skills.0', 'PHP')
            ->assertJsonPath('jobs.0.id', $job->id)
            ->assertJsonPath('jobs.0.match_score', 67)
            ->assertJsonPath('jobs.0.matched_skills.1', 'Laravel');
    }

    public function test_job_recommendations_are_locked_until_the_applicant_passes(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $resume->resumeAnalyses()->create(['verification_status' => 'completed', 'verification_score' => 74]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/jobs/recommendations?resume_id={$resume->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Pass skill verification with a score of at least 75 to view job recommendations.');
    }

    public function test_applicant_updates_include_job_and_latest_interview_result_only_for_the_owner(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $otherResume = Resume::factory()->create(['user_id' => $otherUser->id]);

        $passedJob = Job::create([
            'title' => 'PHP Developer',
            'company' => 'Northstar Digital',
            'description' => 'Build APIs.',
            'required_skills' => ['PHP'],
        ]);
        $pendingJob = Job::create([
            'title' => 'Frontend Developer',
            'company' => 'Bright Works',
            'description' => 'Build interfaces.',
            'required_skills' => ['React'],
        ]);
        $otherJob = Job::create([
            'title' => 'Private Listing',
            'company' => 'Other Company',
            'description' => 'Not this applicant.',
            'required_skills' => ['Go'],
        ]);

        $passedApplication = Application::create([
            'user_id' => $user->id,
            'resume_id' => $resume->id,
            'job_id' => $passedJob->id,
            'status' => 'admin_passed',
        ]);
        $passedApplication->mockInterviews()->create([
            'questions' => [['question' => 'Older interview']],
            'status' => 'completed',
            'review_decision' => 'rejected',
            'review_note' => 'Old result',
        ]);
        $passedApplication->mockInterviews()->create([
            'questions' => [['question' => 'Latest interview']],
            'status' => 'completed',
            'review_decision' => 'passed',
            'review_note' => 'Strong interview.',
            'reviewed_at' => now(),
        ]);

        $pendingApplication = Application::create([
            'user_id' => $user->id,
            'resume_id' => $resume->id,
            'job_id' => $pendingJob->id,
        ]);
        $pendingApplication->mockInterviews()->create([
            'questions' => [['question' => 'Awaiting review']],
            'status' => 'completed',
        ]);

        $otherApplication = Application::create([
            'user_id' => $otherUser->id,
            'resume_id' => $otherResume->id,
            'job_id' => $otherJob->id,
        ]);
        $otherApplication->mockInterviews()->create([
            'questions' => [['question' => 'Private interview']],
            'status' => 'completed',
            'review_decision' => 'rejected',
            'review_note' => 'Private review note.',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/applications/updates')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.job.title', 'Frontend Developer')
            ->assertJsonPath('0.job.company', 'Bright Works')
            ->assertJsonPath('0.interview.status', 'completed')
            ->assertJsonPath('0.interview.review_decision', null)
            ->assertJsonPath('1.job.title', 'PHP Developer')
            ->assertJsonPath('1.job.company', 'Northstar Digital')
            ->assertJsonPath('1.interview.review_decision', 'passed')
            ->assertJsonPath('1.interview.review_note', 'Strong interview.')
            ->assertJsonMissing(['title' => 'Private Listing'])
            ->assertJsonMissing(['review_note' => 'Private review note.']);
    }

    public function test_older_passing_assessment_checks_answers_before_recommending_jobs(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'text' => 'Laravel developer']);
        $resume->resumeAnalyses()->create([
            'verification_status' => 'completed',
            'verification_score' => 80,
            'verification_questions' => [['question' => 'Explain Laravel routing.', 'claim' => 'Laravel experience']],
            'applicant_answers' => ['Routes map paths to handlers.'],
        ]);
        $job = Job::create([
            'title' => 'Junior Laravel Developer',
            'company' => 'Northstar Digital',
            'description' => 'Build API features.',
            'required_skills' => ['Laravel'],
        ]);

        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('identifyVerifiedSkills')->once()->andReturn(['verified_skills' => ['Laravel']]);
        });

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/jobs/recommendations?resume_id={$resume->id}")
            ->assertOk()
            ->assertJsonPath('jobs.0.id', $job->id)
            ->assertJsonPath('verified_skills.0', 'Laravel');

        $this->assertDatabaseHas('resume_analyses', [
            'resume_id' => $resume->id,
            'verified_skills' => '["Laravel"]',
        ]);
    }

    public function test_passing_applicant_can_apply_and_complete_a_mock_interview(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'text' => 'PHP Laravel developer']);
        $resume->resumeAnalyses()->create([
            'verification_status' => 'completed',
            'verification_score' => 82,
            'verified_skills' => ['PHP', 'Laravel'],
        ]);
        $job = Job::create([
            'title' => 'Junior Laravel Developer',
            'company' => 'Northstar Digital',
            'description' => 'Build APIs.',
            'required_skills' => ['PHP', 'Laravel'],
        ]);

        $applicationResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/applications', ['resume_id' => $resume->id, 'job_id' => $job->id]);
        $applicationResponse->assertCreated()->assertJsonPath('status', 'submitted');
        $applicationId = $applicationResponse->json('id');

        $report = [
            'overall_score' => 78,
            'technical_score' => 80,
            'communication_score' => 76,
            'confidence_score' => 77,
            'strengths' => ['Clear examples'],
            'weak_areas' => ['Database tradeoffs'],
            'suggested_improvements' => ['Explain alternatives'],
            'readiness_percentage' => 78,
            'recommendation' => 'Recommended',
        ];
        $this->mock(OpenAIService::class, function ($mock) use ($report) {
            $mock->shouldReceive('generateMockInterview')->once()->andReturn([
                'questions' => [['type' => 'technical', 'question' => 'How do Laravel routes reach a controller?', 'focus' => 'Laravel', 'follow_up' => null]],
            ]);
            $mock->shouldReceive('evaluateInterviewAnswer')->once()->andReturn([
                'scores' => ['accuracy' => 80, 'communication' => 75, 'confidence' => 76, 'technical_depth' => 82, 'relevance' => 80],
                'feedback' => 'Good route-to-controller explanation.',
            ]);
            $mock->shouldReceive('summarizeMockInterview')->once()->andReturn(['report' => $report]);
        });

        $interviewResponse = $this->postJson("/api/applications/{$applicationId}/mock-interview");
        $interviewResponse->assertCreated()->assertJsonPath('questions.0.type', 'technical');
        $interviewId = $interviewResponse->json('id');

        $this->postJson("/api/mock-interviews/{$interviewId}/answers", [
            'question_index' => 0,
            'answer' => 'Laravel maps the route to its controller action.',
        ])->assertOk()
            ->assertJsonPath('interview.status', 'completed')
            ->assertJsonMissingPath('evaluation')
            ->assertJsonMissingPath('report')
            ->assertJsonMissingPath('interview.evaluations')
            ->assertJsonMissingPath('interview.audio_paths');

        $this->getJson("/api/mock-interviews/{$interviewId}")
            ->assertOk()
            ->assertJsonMissingPath('evaluations')
            ->assertJsonMissingPath('report')
            ->assertJsonMissingPath('audio_paths')
            ->assertJsonMissingPath('review_decision');
    }

    public function test_applicant_cannot_access_another_users_interview(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);
        $job = Job::create(['title' => 'Developer', 'company' => 'Example', 'description' => 'Build.', 'required_skills' => ['PHP']]);
        $application = Application::create(['user_id' => $owner->id, 'resume_id' => $resume->id, 'job_id' => $job->id]);
        $interview = $application->mockInterviews()->create(['questions' => [['question' => 'Question?']]]);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/mock-interviews/{$interview->id}")
            ->assertForbidden();
    }

    public function test_applicant_can_transcribe_voice_answer_for_the_current_question(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $job = Job::create(['title' => 'Developer', 'company' => 'Example', 'description' => 'Build.', 'required_skills' => ['PHP']]);
        $application = Application::create(['user_id' => $user->id, 'resume_id' => $resume->id, 'job_id' => $job->id]);
        $interview = $application->mockInterviews()->create([
            'questions' => [['type' => 'technical', 'question' => 'Explain Laravel routing.']],
            'answers' => [],
            'status' => 'in_progress',
        ]);

        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('transcribeInterviewAudio')->once()->andReturn([
                'transcript' => 'Laravel maps a route to a controller action.',
            ]);
        });

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/mock-interviews/{$interview->id}/transcribe", [
                'question_index' => '0',
                'audio' => UploadedFile::fake()->create('answer.webm', 10, 'audio/webm'),
            ])
            ->assertOk()
            ->assertJsonPath('transcript', 'Laravel maps a route to a controller action.');

        $this->assertSame(
            ["interview-audio/{$interview->id}/question-0.webm"],
            $interview->fresh()->audio_paths,
        );
        Storage::disk('local')->assertExists("interview-audio/{$interview->id}/question-0.webm");
    }

    public function test_voice_answer_transcription_rejects_a_future_question_index(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $job = Job::create(['title' => 'Developer', 'company' => 'Example', 'description' => 'Build.', 'required_skills' => ['PHP']]);
        $application = Application::create(['user_id' => $user->id, 'resume_id' => $resume->id, 'job_id' => $job->id]);
        $interview = $application->mockInterviews()->create([
            'questions' => [['question' => 'First question.'], ['question' => 'Second question.']],
            'answers' => [],
            'status' => 'in_progress',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/mock-interviews/{$interview->id}/transcribe", [
                'question_index' => 1,
                'audio' => UploadedFile::fake()->create('answer.webm', 10, 'audio/webm'),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Record an answer for the current interview question.');
    }

    public function test_admin_can_review_private_voice_recording_and_pass_applicant(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $job = Job::create(['title' => 'Developer', 'company' => 'Example', 'description' => 'Build.', 'required_skills' => ['PHP']]);
        $application = Application::create(['user_id' => $user->id, 'resume_id' => $resume->id, 'job_id' => $job->id]);
        $audioPath = 'interview-audio/10/question-0.webm';
        Storage::disk('local')->put($audioPath, 'test-audio');
        $interview = $application->mockInterviews()->create([
            'questions' => [['type' => 'technical', 'question' => 'Explain routing.', 'focus' => 'PHP']],
            'answers' => ['Routes map to handlers.'],
            'evaluations' => [['feedback' => 'Clear answer.', 'scores' => ['accuracy' => 90]]],
            'report' => ['overall_score' => 88, 'recommendation' => 'Recommended'],
            'audio_paths' => ['0' => $audioPath],
            'status' => 'completed',
        ]);

        $adminReview = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/mock-interviews/{$interview->id}")
            ->assertOk()
            ->assertJsonPath('evaluations.0.feedback', 'Clear answer.')
            ->assertJsonPath('report.overall_score', 88)
            ->assertJsonPath('audio_urls.0', fn ($url) => is_string($url) && str_contains($url, '/api/admin/mock-interviews/'));

        $this->get($adminReview->json('audio_urls.0'))
            ->assertOk()
            ->assertHeader('cache-control', 'no-store, private');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/mock-interviews/{$interview->id}/decision", [
                'decision' => 'passed',
                'note' => 'Strong technical explanation and clear communication.',
            ])
            ->assertOk()
            ->assertJsonPath('review_decision', 'passed');

        $this->assertDatabaseHas('applications', ['id' => $application->id, 'status' => 'admin_passed']);
        $this->assertDatabaseHas('mock_interviews', [
            'id' => $interview->id,
            'review_decision' => 'passed',
            'review_note' => 'Strong technical explanation and clear communication.',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_non_admin_cannot_review_interviews_or_decide_applicant_outcome(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $job = Job::create(['title' => 'Developer', 'company' => 'Example', 'description' => 'Build.', 'required_skills' => ['PHP']]);
        $application = Application::create(['user_id' => $user->id, 'resume_id' => $resume->id, 'job_id' => $job->id]);
        $interview = $application->mockInterviews()->create([
            'questions' => [['question' => 'Question?']],
            'status' => 'completed',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/admin/mock-interviews/{$interview->id}")
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/admin/mock-interviews/{$interview->id}/decision", ['decision' => 'passed'])
            ->assertForbidden();
    }

    public function test_hr_role_can_access_interview_review_queue(): void
    {
        $hr = User::factory()->create(['is_admin' => false]);
        $hrRole = Role::firstOrCreate(['name' => 'hr'], ['label' => 'Human Resources']);
        $hr->roles()->attach($hrRole);

        $this->actingAs($hr, 'sanctum')
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('is_hr', true)
            ->assertJsonPath('is_admin', false);

        $this->actingAs($hr, 'sanctum')
            ->getJson('/api/admin/mock-interviews')
            ->assertOk();
    }

    public function test_hr_can_add_job_listings_but_applicants_cannot(): void
    {
        $hr = User::factory()->create(['is_admin' => false]);
        $hrRole = Role::firstOrCreate(['name' => 'hr'], ['label' => 'Human Resources']);
        $hr->roles()->attach($hrRole);
        $payload = [
            'title' => 'PHP Developer',
            'company' => 'Example Co',
            'location' => 'Remote',
            'employment_type' => 'Full-time',
            'description' => 'Build API features.',
            'required_skills' => ['PHP', 'Laravel'],
        ];

        $this->actingAs($hr, 'sanctum')
            ->postJson('/api/admin/jobs', $payload)
            ->assertCreated()
            ->assertJsonPath('title', 'PHP Developer')
            ->assertJsonPath('required_skills.1', 'Laravel');

        $applicant = User::factory()->create(['is_admin' => false]);
        $this->actingAs($applicant, 'sanctum')
            ->postJson('/api/admin/jobs', $payload)
            ->assertForbidden();
    }
}