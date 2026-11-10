<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Job;
use App\Models\MockInterview;
use App\Models\Resume;
use App\Models\ResumeAnalysis;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_sign_in_and_view_admin_pages(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'password',
            'is_admin' => true,
        ]);

        $this->get('/admin/login')->assertOk()->assertSee('Sign in to workspace')->assertSee('Galila');
        $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ])->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
        $this->get('/admin')->assertOk()->assertSee('Application activity')->assertSee('Galila');
        $this->get('/admin/reports')->assertOk()->assertSee('Application pipeline');
        $this->get('/admin/applicants')->assertOk()->assertSee('Applicant directory');
        $this->get('/admin/jobs')->assertOk()->assertSee('Create a listing');
        $this->get('/admin/interviews')->assertOk()->assertSee('Interview queue');
    }

    public function test_admin_can_search_applicants_without_listing_staff_accounts(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $applicant = User::factory()->create([
            'name' => 'Jamie Applicant',
            'email' => 'jamie@example.com',
        ]);
        User::factory()->create([
            'name' => 'Taylor Candidate',
            'email' => 'taylor@example.com',
        ]);
        $hr = User::factory()->create(['name' => 'HR Account']);
        $hrRole = Role::create(['name' => 'hr', 'label' => 'Human Resources']);
        $hr->roles()->attach($hrRole);
        Resume::factory()->create(['user_id' => $applicant->id]);

        $this->actingAs($admin)
            ->get('/admin/applicants?q=Jamie&resume=uploaded')
            ->assertOk()
            ->assertSee('Jamie Applicant')
            ->assertSee('jamie@example.com')
            ->assertDontSee('Taylor Candidate')
            ->assertDontSee('HR Account')
            ->assertDontSee('admin@example.com');

        $this->actingAs($admin)
            ->get('/admin/applicants?resume=missing')
            ->assertOk()
            ->assertSee('Taylor Candidate')
            ->assertDontSee('Jamie Applicant');

        $this->actingAs($admin)
            ->get(route('admin.applicants.show', $hr))
            ->assertNotFound();
    }

    public function test_admin_can_view_applicant_resume_analysis_applications_and_private_pdf(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['is_admin' => true]);
        $applicant = User::factory()->create([
            'name' => 'Jamie Applicant',
            'email' => 'jamie@example.com',
        ]);
        $resumePath = 'resumes/jamie-private-resume.pdf';
        Storage::disk('local')->put($resumePath, '%PDF-1.4 applicant resume');
        $resume = Resume::create([
            'user_id' => $applicant->id,
            'filename' => 'jamie-resume.pdf',
            'path' => $resumePath,
            'text' => 'Private extracted resume text.',
            'status' => 'analyzed',
        ]);
        ResumeAnalysis::create([
            'resume_id' => $resume->id,
            'score' => 88,
            'strengths' => ['Clear project experience'],
            'weaknesses' => ['Add measurable outcomes'],
            'suggestions' => ['Quantify project impact'],
            'verified_skills' => ['Laravel', 'PHP'],
            'verification_score' => 91,
            'verification_status' => 'completed',
        ]);
        $job = Job::create([
            'title' => 'Backend Engineer',
            'company' => 'Galila',
            'location' => 'Remote',
            'employment_type' => 'Full-time',
            'description' => 'Build hiring tools.',
            'required_skills' => ['PHP'],
        ]);
        $application = Application::create([
            'user_id' => $applicant->id,
            'resume_id' => $resume->id,
            'job_id' => $job->id,
        ]);
        $interview = MockInterview::create([
            'application_id' => $application->id,
            'questions' => ['Tell us about a project.'],
            'status' => 'completed',
            'report' => ['overall_score' => 85],
        ]);

        $this->actingAs($admin)
            ->get(route('admin.applicants.show', $applicant))
            ->assertOk()
            ->assertSee('Jamie Applicant')
            ->assertSee('jamie@example.com')
            ->assertSee('jamie-resume.pdf')
            ->assertSee('Clear project experience')
            ->assertSee('Laravel')
            ->assertSee('Backend Engineer')
            ->assertSee('Score 85')
            ->assertSee(route('admin.resumes.file', $resume), false)
            ->assertDontSee($resumePath);

        $this->actingAs($applicant)
            ->get(route('admin.resumes.file', $resume))
            ->assertForbidden();

        $this->actingAs($admin)
            ->get(route('admin.resumes.file', $resume))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('x-content-type-options', 'nosniff');

        $this->assertDatabaseHas('mock_interviews', ['id' => $interview->id]);
    }

    public function test_regular_users_cannot_open_admin_dashboard(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin/applicants')
            ->assertForbidden();
    }

    public function test_admin_can_publish_a_job_listing(): void
    {
        $this->actingAs(User::factory()->create(['is_admin' => true]))
            ->post('/admin/jobs', [
                'title' => 'Backend Engineer',
                'company' => 'Hirewise',
                'location' => 'Remote',
                'employment_type' => 'Full-time',
                'description' => 'Build hiring tools.',
                'required_skills' => ' Laravel, PHP, Laravel ',
            ])
            ->assertRedirect(route('admin.jobs'));

        $this->assertSame(['Laravel', 'PHP'], Job::firstOrFail()->required_skills);
    }

    public function test_admin_can_record_an_interview_decision(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $applicant = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $applicant->id]);
        $job = Job::create([
            'title' => 'Backend Engineer',
            'company' => 'Hirewise',
            'location' => 'Remote',
            'employment_type' => 'Full-time',
            'description' => 'Build hiring tools.',
            'required_skills' => ['PHP'],
        ]);
        $application = Application::create([
            'user_id' => $applicant->id,
            'resume_id' => $resume->id,
            'job_id' => $job->id,
        ]);
        $interview = MockInterview::create([
            'application_id' => $application->id,
            'questions' => ['Tell us about a project.'],
            'status' => 'completed',
            'report' => ['overall_score' => 85],
        ]);

        $this->actingAs($admin)
            ->get("/admin/interviews/{$interview->id}")
            ->assertOk()
            ->assertSee('Tell us about a project.')
            ->assertSee('HR decision');

        $this->actingAs($admin)
            ->post("/admin/interviews/{$interview->id}/decision", [
                'decision' => 'passed',
                'note' => 'Strong technical answers.',
            ])
            ->assertRedirect(route('admin.interviews.show', $interview));

        $this->assertDatabaseHas('mock_interviews', [
            'id' => $interview->id,
            'review_decision' => 'passed',
            'reviewed_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'admin_passed',
        ]);
    }
}
