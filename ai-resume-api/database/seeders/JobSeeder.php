<?php

namespace Database\Seeders;

use App\Models\Job;
use Illuminate\Database\Seeder;

class JobSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = [
            [
                'title' => 'Junior Laravel Developer',
                'company' => 'Northstar Digital',
                'location' => 'Remote',
                'employment_type' => 'Full-time',
                'description' => 'Build and maintain Laravel APIs and web features with support from a senior engineering team.',
                'required_skills' => ['PHP', 'Laravel', 'MySQL', 'REST APIs', 'Git'],
            ],
            [
                'title' => 'Entry-Level Web Developer',
                'company' => 'Brightpath Studio',
                'location' => 'Dagupan City / Hybrid',
                'employment_type' => 'Full-time',
                'description' => 'Deliver responsive websites and integrate frontend interfaces with backend services.',
                'required_skills' => ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL'],
            ],
            [
                'title' => 'Junior React Developer',
                'company' => 'Orbit Labs',
                'location' => 'Remote',
                'employment_type' => 'Full-time',
                'description' => 'Create and improve React interfaces, connect APIs, and collaborate on product delivery.',
                'required_skills' => ['React', 'JavaScript', 'REST APIs', 'Git'],
            ],
            [
                'title' => 'IT Support Technician',
                'company' => 'Civic Systems Group',
                'location' => 'Dagupan City',
                'employment_type' => 'Full-time',
                'description' => 'Provide first-line technical support, maintain workstations, and assist with network troubleshooting.',
                'required_skills' => ['Troubleshooting', 'Windows', 'Networking', 'Linux', 'Communication'],
            ],
            [
                'title' => 'Junior QA Automation Engineer',
                'company' => 'Quality Harbor',
                'location' => 'Remote',
                'employment_type' => 'Full-time',
                'description' => 'Help validate web releases, write repeatable test cases, and report clear defect evidence.',
                'required_skills' => ['JavaScript', 'Testing', 'REST APIs', 'Git', 'Problem solving'],
            ],
        ];

        foreach ($jobs as $job) {
            Job::updateOrCreate(
                ['title' => $job['title'], 'company' => $job['company']],
                $job,
            );
        }
    }
}