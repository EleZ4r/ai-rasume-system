<?php

namespace Tests\Unit;

use App\Services\OpenAIService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAIServiceTest extends TestCase
{
    public function test_verification_waits_for_rate_limit_window_and_retries(): void
    {
        putenv('AI_API_KEY=test-key');

        Http::fake([
            '*' => Http::sequence()
                ->push([
                    'error' => [
                        'message' => 'Rate limit reached. Please try again in 1s.',
                    ],
                ], 429)
                ->push([
                    'choices' => [[
                        'message' => [
                            'content' => json_encode([
                                'verification_score' => 82,
                                'verification_feedback' => 'Answers demonstrated the claimed skills.',
                                'verified_skills' => ['Laravel'],
                                'weak_topics' => [],
                            ]),
                        ],
                    ]],
                ], 200),
        ]);

        try {
            $result = app(OpenAIService::class)->evaluateVerification(
                'Laravel developer',
                [['question' => 'Explain a Laravel route.']],
                ['Routes map requests to handlers.'],
            );

            $this->assertSame(82, $result['verification_score']);
            $this->assertSame(['Laravel'], $result['verified_skills']);
            Http::assertSentCount(2);
        } finally {
            putenv('AI_API_KEY');
        }
    }
}