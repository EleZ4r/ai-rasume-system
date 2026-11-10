<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Resume;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AdminResumesTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_resumes()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')
             ->getJson('/api/admin/resumes')
             ->assertStatus(403);
    }

    public function test_admin_can_view_resumes()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Resume::factory()->count(3)->create(['user_id' => $admin->id]);

        $this->actingAs($admin, 'sanctum')
             ->getJson('/api/admin/resumes')
             ->assertStatus(200)
             ->assertJsonStructure(['data', 'current_page']);
    }

    public function test_admin_can_view_another_users_resume_detail()
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $applicant = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $applicant->id,
            'filename' => 'applicant-resume.pdf',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/resumes/{$resume->id}")
            ->assertOk()
            ->assertJsonPath('filename', 'applicant-resume.pdf');
    }
}
