<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminHrUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminHrUsersSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setSeedEnvironment('ADMIN_SEED_EMAIL', 'admin@ai-resume-system.test');
        $this->setSeedEnvironment('ADMIN_SEED_PASSWORD', 'test-admin-passphrase');
        $this->setSeedEnvironment('HR_SEED_EMAIL', 'hr@ai-resume-system.test');
        $this->setSeedEnvironment('HR_SEED_PASSWORD', 'test-hr-passphrase');
    }

    public function test_it_creates_configured_admin_and_hr_accounts_with_matching_roles(): void
    {
        $this->seed(AdminHrUsersSeeder::class);

        $admin = User::where('email', 'admin@ai-resume-system.test')->firstOrFail();
        $hr = User::where('email', 'hr@ai-resume-system.test')->firstOrFail();

        $this->assertTrue($admin->is_admin);
        $this->assertTrue($admin->roles()->where('name', 'admin')->exists());
        $this->assertTrue(Hash::check('test-admin-passphrase', $admin->password));

        $this->assertFalse($hr->is_admin);
        $this->assertTrue($hr->is_hr);
        $this->assertTrue($hr->roles()->where('name', 'hr')->exists());
        $this->assertTrue(Hash::check('test-hr-passphrase', $hr->password));
    }

    public function test_seeding_again_does_not_reset_existing_account_passwords(): void
    {
        $this->seed(AdminHrUsersSeeder::class);
        $admin = User::where('email', 'admin@ai-resume-system.test')->firstOrFail();
        $admin->password = 'changed-after-first-login';
        $admin->save();

        $this->seed(AdminHrUsersSeeder::class);

        $this->assertTrue(Hash::check('changed-after-first-login', $admin->fresh()->password));
    }

    public function test_it_requires_explicit_staff_credentials(): void
    {
        foreach (['ADMIN_SEED_EMAIL', 'ADMIN_SEED_PASSWORD', 'HR_SEED_EMAIL', 'HR_SEED_PASSWORD'] as $key) {
            putenv($key);
            unset($_ENV[$key], $_SERVER[$key]);
        }

        $this->expectException(\RuntimeException::class);
        $this->seed(AdminHrUsersSeeder::class);
    }

    private function setSeedEnvironment(string $key, string $value): void
    {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}