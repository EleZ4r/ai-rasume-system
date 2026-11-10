<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resume>
 */
class ResumeFactory extends Factory
{
    protected $model = Resume::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'filename' => fake()->lexify('resume-????.pdf'),
            'path' => 'resumes/' . fake()->uuid() . '.pdf',
            'text' => fake()->paragraph(),
            'status' => 'uploaded',
        ];
    }
}
