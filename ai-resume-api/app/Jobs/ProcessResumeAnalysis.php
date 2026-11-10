<?php

namespace App\Jobs;

use App\Models\Resume;
use App\Models\ResumeAnalysis;
use App\Services\DocumentExtractor;
use App\Services\OpenAIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessResumeAnalysis implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $resumeId;

    public ?string $expectedPath;

    public int $tries = 2;

    public function backoff(): array
    {
        return [15];
    }

    public function failed(\Throwable $exception): void
    {
        $resume = Resume::find($this->resumeId);
        if (! $resume || ($this->expectedPath !== null && $resume->path !== $this->expectedPath)) {
            return;
        }

        $resume->status = 'analysis_failed';
        $resume->save();

        ResumeAnalysis::create([
            'resume_id' => $resume->id,
            'raw_response' => ['error' => 'Analysis stopped after retries: ' . $exception->getMessage()],
        ]);
    }

    public function __construct(int $resumeId, ?string $expectedPath = null)
    {
        $this->resumeId = $resumeId;
        $this->expectedPath = $expectedPath;
    }

    public function handle(DocumentExtractor $extractor, OpenAIService $ai)
    {
        $resume = Resume::find($this->resumeId);
        if (! $resume || ($this->expectedPath !== null && $resume->path !== $this->expectedPath)) {
            return;
        }

        $text = $extractor->extractText($resume->path);
        $resume->text = substr($text, 0, 200000);
        $resume->status = 'processing';
        $resume->save();

        $result = $ai->analyzeResume($resume->text);
        $resume->refresh();
        if ($this->expectedPath !== null && $resume->path !== $this->expectedPath) {
            return;
        }

        if (! empty($result['error'])) {
            $retryable = ($result['status'] ?? null) === 429
                || str_contains(strtolower((string) $result['error']), 'incomplete');
            if ($retryable) {
                throw new \RuntimeException($result['error']);
            }

            $resume->status = 'analysis_failed';
            $resume->save();

            ResumeAnalysis::create([
                'resume_id' => $resume->id,
                'raw_response' => $result['raw'] ?? ['error' => $result['error']],
            ]);

            return;
        }

        ResumeAnalysis::create([
            'resume_id' => $resume->id,
            'score' => $result['score'] ?? null,
            'strengths' => $result['strengths'] ?? null,
            'weaknesses' => $result['weaknesses'] ?? null,
            'suggestions' => $result['suggestions'] ?? null,
            'reviewer_basis' => $result['reviewer_basis'] ?? null,
            'verification_questions' => $result['verification_questions'] ?? null,
            'raw_response' => $result['raw'] ?? null,
        ]);

        $resume->status = 'processed';
        $resume->save();
    }
}
