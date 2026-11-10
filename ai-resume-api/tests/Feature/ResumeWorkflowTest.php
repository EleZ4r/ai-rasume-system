<?php

namespace Tests\Feature;

use App\Jobs\ProcessResumeAnalysis;
use App\Models\Role;
use App\Models\Resume;
use App\Models\User;
use App\Services\OpenAIService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_only_their_own_resumes(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Resume::factory()->create(['user_id' => $user->id, 'filename' => 'mine.pdf']);
        Resume::factory()->create(['user_id' => $otherUser->id, 'filename' => 'other.pdf']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/resumes')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.filename', 'mine.pdf');
    }

    public function test_applicant_sees_only_the_latest_resume_record(): void
    {
        $user = User::factory()->create();
        Resume::factory()->create(['user_id' => $user->id, 'filename' => 'older.pdf']);
        Resume::factory()->create(['user_id' => $user->id, 'filename' => 'current.pdf']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/resumes')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.filename', 'current.pdf');
    }

    public function test_authenticated_user_can_upload_a_resume(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $file = $this->pdfFile($this->resumeText());

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/resume/upload', ['file' => $file]);

        $response->assertCreated()
            ->assertJsonPath('filename', 'resume.pdf')
            ->assertJsonPath('status', 'uploaded');

        $this->assertDatabaseHas('resumes', [
            'user_id' => $user->id,
            'filename' => 'resume.pdf',
            'status' => 'uploaded',
        ]);
    }

    public function test_applicant_cannot_submit_a_second_resume_without_replacing_the_first(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        Resume::factory()->create(['user_id' => $user->id, 'filename' => 'first.pdf']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/resume/upload', ['file' => $this->pdfFile($this->resumeText())])
            ->assertStatus(409)
            ->assertJsonPath('message', 'You already submitted a resume. Replace your current resume instead.');

        $this->assertDatabaseCount('resumes', 1);
    }

    public function test_upload_rejects_a_valid_pdf_that_does_not_look_like_a_resume(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $documentText = implode("\n", [
            'Quarterly Business Report',
            str_repeat('This report summarizes revenue, quarterly performance, and planned operations. ', 8),
            'Contact: finance@example.com',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/resume/upload', ['file' => $this->pdfFile($documentText)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('resumes', 0);
    }

    public function test_replacement_updates_the_existing_resume_and_clears_stale_analysis(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $oldPath = 'resumes/old-resume.pdf';
        Storage::put($oldPath, 'old resume file');
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'filename' => 'old-resume.pdf',
            'path' => $oldPath,
            'text' => 'Old resume text',
            'status' => 'processed',
        ]);
        $resume->resumeAnalyses()->create(['score' => 82]);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/resume/{$resume->id}/replace", [
                'file' => $this->pdfFile('Quarterly results and financial projections. ' . str_repeat('Revenue increased during the year. ', 8)),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseHas('resumes', [
            'id' => $resume->id,
            'path' => $oldPath,
            'status' => 'processed',
        ]);
        $this->assertDatabaseCount('resume_analyses', 1);
        Storage::assertExists($oldPath);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/resume/{$resume->id}/replace", [
                'file' => $this->pdfFile($this->resumeText('Updated Candidate')),
            ]);

        $response->assertOk()
            ->assertJsonPath('id', $resume->id)
            ->assertJsonPath('filename', 'resume.pdf')
            ->assertJsonPath('status', 'uploaded');
        $this->assertDatabaseCount('resumes', 1);
        $this->assertDatabaseCount('resume_analyses', 0);
        $this->assertDatabaseHas('resumes', [
            'id' => $resume->id,
            'user_id' => $user->id,
            'text' => null,
            'status' => 'uploaded',
        ]);
        Storage::assertMissing($oldPath);
        Storage::assertExists($response->json('path'));
    }

    public function test_applicant_cannot_replace_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $otherApplicant = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($otherApplicant, 'sanctum')
            ->putJson("/api/resume/{$resume->id}/replace", [
                'file' => $this->pdfFile($this->resumeText()),
            ])
            ->assertForbidden();
    }

    public function test_admin_cannot_upload_a_resume(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('admin-resume.pdf', 20, 'application/pdf');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/resume/upload', ['file' => $file])
            ->assertForbidden()
            ->assertJson(['message' => 'Staff accounts cannot upload resumes.']);

        $this->assertDatabaseMissing('resumes', ['filename' => 'admin-resume.pdf']);
    }

    public function test_hr_cannot_upload_an_applicant_resume(): void
    {
        $hr = User::factory()->create(['is_admin' => false]);
        $hr->roles()->attach(Role::firstOrCreate(['name' => 'hr'], ['label' => 'Human Resources']));

        $this->actingAs($hr, 'sanctum')
            ->postJson('/api/resume/upload', ['file' => UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf')])
            ->assertForbidden()
            ->assertJson(['message' => 'Staff accounts cannot upload resumes.']);

        $this->assertDatabaseCount('resumes', 0);
    }

    public function test_analyze_dispatches_processing_job(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/resume/{$resume->id}/analyze");

        $response->assertAccepted()
            ->assertJson(['message' => 'Analysis queued']);
        Queue::assertPushed(ProcessResumeAnalysis::class, fn ($job) => $job->resumeId === $resume->id);
    }

    public function test_applicant_can_submit_fifty_answers_for_ai_verification(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'text' => 'PHP and Laravel experience.']);
        $resume->resumeAnalyses()->create([
            'verification_questions' => array_map(fn ($index) => ['question' => "Question {$index}", 'claim' => 'PHP experience'], range(1, 50)),
        ]);

        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('evaluateVerification')->once()->andReturn([
                'verification_score' => 86,
                'verification_feedback' => 'Answers consistently support the resume claims.',
            ]);
        });

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/resume/{$resume->id}/verify", ['answers' => array_fill(0, 50, 'I can explain this experience.')]);

        $response->assertOk()
            ->assertJsonPath('verification_score', 86)
            ->assertJsonPath('verification_status', 'completed');
    }

    public function test_missing_verification_score_does_not_mark_assessment_completed(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $analysis = $resume->resumeAnalyses()->create([
            'verification_questions' => [['question' => 'Explain Laravel routing.']],
        ]);

        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('evaluateVerification')->once()->andReturn([
                'verification_score' => null,
                'verification_feedback' => null,
            ]);
        });

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/resume/{$resume->id}/verify", ['answers' => ['Routes map URLs to handlers.']])
            ->assertStatus(502)
            ->assertJsonPath('message', 'AI could not produce a valid assessment score. Please retry evaluation.');

        $this->assertDatabaseHas('resume_analyses', [
            'id' => $analysis->id,
            'verification_status' => 'evaluation_failed',
            'verification_score' => null,
            'applicant_answers' => '["Routes map URLs to handlers."]',
        ]);
    }

    public function test_rate_limited_verification_saves_answers_and_can_be_retried(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $analysis = $resume->resumeAnalyses()->create([
            'verification_questions' => [['question' => 'Explain Laravel routing.']],
        ]);

        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('evaluateVerification')->twice()->andReturn(
                [
                    'error' => 'The AI evaluator is busy. Wait 15 seconds, then submit your answers again. Your answers are still here.',
                    'status' => 429,
                ],
                [
                    'verification_score' => 78,
                    'verification_feedback' => 'Good evidence across the verified topics.',
                    'verified_skills' => ['Laravel'],
                    'weak_topics' => [],
                ],
            );
        });

        $actingAs = $this->actingAs($user, 'sanctum');
        $actingAs->postJson("/api/resume/{$resume->id}/verify", ['answers' => ['I can explain Laravel routes.']])
            ->assertStatus(429)
            ->assertJsonPath('message', 'The AI evaluator is busy. Wait 15 seconds, then submit your answers again. Your answers are still here.');

        $this->assertDatabaseHas('resume_analyses', [
            'id' => $analysis->id,
            'verification_status' => 'evaluation_failed',
            'verification_score' => null,
            'applicant_answers' => '["I can explain Laravel routes."]',
        ]);

        $actingAs->postJson("/api/resume/{$resume->id}/verify", ['answers' => ['I can explain Laravel routes.']])
            ->assertOk()
            ->assertJsonPath('verification_score', 78)
            ->assertJsonPath('verification_status', 'completed');
    }

    public function test_failed_assessment_generates_and_persists_personalized_reviewer(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'text' => 'PHP and Laravel experience.']);
        $resume->resumeAnalyses()->create([
            'verification_questions' => [['question' => 'Explain Laravel routing.']],
        ]);
        $this->mock(OpenAIService::class, function ($mock) {
            $mock->shouldReceive('evaluateVerification')->once()->andReturn([
                'verification_score' => 54,
                'verification_feedback' => 'Review route matching and middleware.',
                'weak_topics' => ['Route matching', 'Middleware'],
            ]);
        });

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/resume/{$resume->id}/verify", ['answers' => ['Not sure.']]);

        $response->assertOk()
            ->assertJsonPath('verification_score', 54)
            ->assertJsonPath('verification_status', 'completed')
            ->assertJsonPath('verification_weak_topics.0', 'Route matching')
            ->assertJsonPath('personalized_reviewer', null);
    }

    public function test_applicant_can_retry_personalized_reviewer_generation(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $resume->resumeAnalyses()->create([
            'verification_questions' => [['question' => 'Explain Laravel routing.']],
            'applicant_answers' => ['Not sure.'],
            'verification_score' => 54,
            'verification_status' => 'completed',
            'verification_weak_topics' => ['Route matching'],
        ]);
        $reviewer = ['topics' => [['title' => 'Laravel routing']]];

        $this->mock(OpenAIService::class, function ($mock) use ($reviewer) {
            $mock->shouldReceive('generatePersonalizedReviewer')->once()->andReturn(['reviewer' => $reviewer]);
        });

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/resume/{$resume->id}/reviewer")
            ->assertOk()
            ->assertJsonPath('personalized_reviewer.topics.0.title', 'Laravel routing');
    }

    private function resumeText(string $name = 'Example Candidate'): string
    {
        return implode("\n", [
            $name,
            'example.candidate@example.com',
            '+1 555 010 2345',
            'Professional Summary',
            str_repeat('Software developer with experience building reliable applications and collaborating across teams. ', 3),
            'Experience',
            'Software Developer, Example Company',
            'Education',
            'Bachelor of Science in Computer Science',
            'Skills',
            'PHP, Laravel, SQL, problem solving',
        ]);
    }

    private function pdfFile(string $text): UploadedFile
    {
        $stream = "BT /F1 10 Tf 50 750 Td\n";
        foreach (explode("\n", $text) as $line) {
            $escapedLine = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            $stream .= "({$escapedLine}) Tj\n0 -14 Td\n";
        }
        $stream .= 'ET';

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            "<< /Length " . strlen($stream) . " >>\nstream\n{$stream}\nendstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1) . " 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefOffset}\n%%EOF\n";

        return UploadedFile::fake()->createWithContent('resume.pdf', $pdf);
    }
}
