<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class OpenAIService
{
    protected string $base;

    public function __construct()
    {
        $this->base = rtrim(env('AI_BASE_URL', 'https://api.groq.com/openai/v1'), '/');
    }

    public function analyzeResume(string $text): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $prompt = "Review this resume and return ONLY compact valid JSON with keys score, strengths, weaknesses, suggestions, reviewer_basis, verification_questions. Return exactly 30 questions. Use ONLY multiple_choice, essay, and course_specific. Include at least 3 course_specific questions and at least 1 multiple_choice and 1 essay. Keep every question, claim, and option very short. Each item needs question_type, question, and claim. Multiple choice needs exactly 3 options. Course-specific needs course. Do not include difficulty, weight, answer_format, explanations, or markdown. Course-specific means coding/debugging for IT/software, equation/design for engineering, anatomy/clinical reasoning for nursing/health, or a practical task from another field explicitly in the resume. Use only resume facts. Resume:\n" . $text;

        $response = Http::timeout(45)->connectTimeout(10)->retry(1, 2000, throw: false)->withToken($key)
            ->post($this->base . '/chat/completions', [
                'model' => env('AI_MODEL', 'llama-3.3-70b-versatile'),
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a rigorous but fair resume reviewer. Output only valid JSON.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'reasoning_effort' => 'low',
                'max_tokens' => 7000,
            ]);

        if ($response->failed()) {
            Log::error('OpenAI resume analysis request failed', [
                'status' => $response->status(),
                'response' => $response->json() ?: $response->body(),
            ]);

            return [
                'error' => 'OpenAI request failed',
                'status' => $response->status(),
                'raw' => $response->json() ?: ['body' => $response->body()],
            ];
        }

        $body = $response->json();
        $raw = $body;

        $textOutput = $body['choices'][0]['message']['content'] ?? null;

        $parsed = null;
        if ($textOutput) {
            $parsed = $this->parseJson($textOutput);
        }

        $questions = $this->normalizeQuestions($parsed['verification_questions'] ?? null);
        if (count(array_filter($questions, static fn ($question) => ($question['question_type'] ?? null) === 'course_specific')) < 3) {
            $questions = array_merge($questions, $this->fallbackCourseQuestions($text));
        }
        while (count($questions) < 30) {
            $questions[] = [
                'question_type' => 'essay',
                'question' => 'Explain one skill or project documented in your resume.',
                'claim' => 'Resume experience',
                'answer_format' => 'essay',
                'difficulty' => 'intermediate',
                'weight' => 10,
            ];
        }
        $questionTypes = array_count_values(array_column($questions, 'question_type'));
        $allowedTypes = ['multiple_choice', 'essay', 'course_specific'];
        $hasRequiredTypes = ($questionTypes['multiple_choice'] ?? 0) > 0
            && ($questionTypes['essay'] ?? 0) > 0
            && ($questionTypes['course_specific'] ?? 0) >= 3;
        $hasOnlyAllowedTypes = count(array_diff(array_keys($questionTypes), $allowedTypes)) === 0;
        if (! is_array($parsed) || count($questions) < 30 || ! $hasRequiredTypes || ! $hasOnlyAllowedTypes) {
            Log::error('AI resume analysis returned incomplete structured output', [
                'has_content' => (bool) $textOutput,
                'question_count' => count($questions),
                'question_types' => $questionTypes,
                'finish_reason' => $body['choices'][0]['finish_reason'] ?? null,
            ]);

            return [
                'error' => 'AI returned an incomplete resume analysis. Please retry.',
                'raw' => $raw,
            ];
        }

        $normalizedScore = $this->normalizeScore(
            $parsed['score'] ?? $parsed['overall_score'] ?? $parsed['total_score'] ?? $parsed['rating'] ?? null
        );

        return [
            'raw' => $raw,
            'score' => $normalizedScore,
            'strengths' => $this->normalizeSummaryItems($parsed['strengths'] ?? null),
            'weaknesses' => $this->normalizeSummaryItems($parsed['weaknesses'] ?? null),
            'suggestions' => $this->normalizeSummaryItems($parsed['suggestions'] ?? null),
            'reviewer_basis' => $parsed['reviewer_basis'] ?? null,
            'verification_questions' => array_slice($questions, 0, 30),
        ];
    }

    public function evaluateVerification(string $resumeText, array $questions, array $answers): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $test = [];
        foreach ($questions as $index => $question) {
            $test[] = [
                'question_type' => $question['question_type'] ?? 'essay',
                'question' => $question['question'] ?? '',
                'course' => $question['course'] ?? null,
                'answer' => mb_substr($answers[$index] ?? '', 0, 1200),
            ];
        }

        $prompt = "Evaluate these resume-test answers. Return only compact valid JSON with verification_score (integer 0-100), verification_feedback (one short paragraph), verified_skills (array of skills explicitly present in the resume and demonstrated by these answers), and weak_topics (array of specific skills/topics answered poorly, empty when none). Judge accuracy, relevance, and completeness using only resume claims. Do not invent skills. Test:\n" . json_encode($test, JSON_UNESCAPED_SLASHES);

        $payload = [
            'model' => env('AI_MODEL', 'openai/gpt-oss-20b'),
            'messages' => [
                ['role' => 'system', 'content' => 'You are a fair resume verification assessor. Output only valid JSON.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => 1200,
        ];

        $response = null;
        $retrySeconds = 0;
        for ($attempt = 0; $attempt < 3; $attempt++) {
            if ($attempt > 0) {
                usleep($retrySeconds * 1_000_000);
            }
            $response = Http::timeout(45)->connectTimeout(10)->withToken($key)
                ->post($this->base . '/chat/completions', $payload);
            if ($response->status() !== 429 || $attempt === 2) {
                break;
            }

            $retrySeconds = $this->rateLimitRetrySeconds($response, $attempt);
        }

        if ($response->failed()) {
            Log::error('AI resume verification request failed', ['status' => $response->status(), 'response' => $response->json() ?: $response->body()]);
            if ($response->status() === 429) {
                $retrySeconds = $this->rateLimitRetrySeconds($response, 0);
                $retryMessage = $retrySeconds
                    ? "The AI evaluator is busy. Wait {$retrySeconds} seconds, then submit your answers again. Your answers are still here."
                    : 'The AI evaluator is busy. Wait a short time, then submit your answers again. Your answers are still here.';

                return [
                    'error' => $retryMessage,
                    'status' => 429,
                ];
            }

            return ['error' => 'AI verification request failed: ' . ($response->json('error.message') ?? 'provider error')];
        }

        $body = $response->json();
        $parsed = $this->parseJson($body['choices'][0]['message']['content'] ?? '');
        if (! is_array($parsed) || ! isset($parsed['verification_score']) || ! is_numeric($parsed['verification_score'])) {
            Log::warning('AI resume verification returned no numeric score', [
                'has_content' => ! empty($body['choices'][0]['message']['content']),
            ]);

            return ['error' => 'AI could not produce a valid assessment score. Please retry evaluation.'];
        }

        return [
            'verification_score' => max(0, min(100, (int) $parsed['verification_score'])),
            'verification_feedback' => $parsed['verification_feedback'] ?? null,
            'verified_skills' => $this->normalizeSummaryItems($parsed['verified_skills'] ?? null) ?? [],
            'weak_topics' => $this->normalizeSummaryItems($parsed['weak_topics'] ?? null) ?? [],
        ];
    }

    private function rateLimitRetrySeconds(\Illuminate\Http\Client\Response $response, int $attempt): int
    {
        $retryAfter = $response->header('Retry-After');
        if ($retryAfter && is_numeric($retryAfter)) {
            return min(30, max(1, (int) ceil((float) $retryAfter)));
        }

        $providerMessage = (string) $response->json('error.message', '');
        if (preg_match('/try again in ([\d.]+)s/i', $providerMessage, $matches)) {
            return min(30, max(1, (int) ceil((float) $matches[1])));
        }

        return min(10, 2 ** ($attempt + 1));
    }

    public function generateMockInterview(string $resumeText, array $verifiedSkills, array $job): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $prompt = "Create a realistic six-question mock interview for this applied role. Base every question on the resume, verified skills, and job description below. Include technical, behavioral, situational, and resume-based questions, prioritizing verified skills. Return only JSON with questions, an array of exactly 6 objects with type (technical|behavioral|situational|resume), question, focus, and follow_up (string or null). Do not ask about skills absent from verified skills. Job: " . json_encode($job, JSON_UNESCAPED_SLASHES) . "\nVerified skills: " . json_encode($verifiedSkills, JSON_UNESCAPED_SLASHES) . "\nResume: " . mb_substr($resumeText, 0, 12000);

        $response = Http::timeout(60)->connectTimeout(10)->retry(1, 1500, throw: false)->withToken($key)
            ->post($this->base . '/chat/completions', [
                'model' => env('AI_MODEL', 'openai/gpt-oss-20b'),
                'messages' => [
                    ['role' => 'system', 'content' => 'You are an experienced technical interviewer. Return only valid JSON.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 2200,
            ]);

        if ($response->failed()) {
            return ['error' => $this->aiRequestError($response, 'Mock interview generation failed.')];
        }

        $body = $response->json();
        $parsed = $this->parseJson($body['choices'][0]['message']['content'] ?? '');
        $questions = $parsed['questions'] ?? null;
        if (! is_array($questions) || count($questions) < 4) {
            return ['error' => 'AI returned an incomplete mock interview. Please try again.'];
        }

        return ['questions' => array_values(array_map(static fn ($question) => [
            'type' => in_array($question['type'] ?? '', ['technical', 'behavioral', 'situational', 'resume'], true) ? $question['type'] : 'technical',
            'question' => trim((string) ($question['question'] ?? '')),
            'focus' => trim((string) ($question['focus'] ?? 'Role readiness')),
            'follow_up' => isset($question['follow_up']) ? trim((string) $question['follow_up']) : null,
        ], array_slice(array_filter($questions, static fn ($question) => is_array($question) && ! empty($question['question'])), 0, 8)))];
    }

    public function identifyVerifiedSkills(string $resumeText, array $questions, array $answers): array
    {
        $test = [];
        foreach ($questions as $index => $question) {
            $test[] = [
                'question' => $question['question'] ?? '',
                'resume_claim' => $question['claim'] ?? null,
                'answer' => mb_substr($answers[$index] ?? '', 0, 1000),
            ];
        }

        $result = $this->requestJson(
            'Identify technical or professional skills that the applicant demonstrably possesses. Return JSON with verified_skills as an array of short skill names. Include a skill only if it is explicitly supported by the resume AND the applicant gave a substantively correct answer demonstrating it. Do not infer proficiency from keyword presence, empty answers, or resume claims alone. Return an empty array if none are demonstrated.',
            "Resume evidence: " . mb_substr($resumeText, 0, 12000) . "\nAssessment questions and answers: " . json_encode($test, JSON_UNESCAPED_SLASHES),
            1000,
        );
        if (! empty($result['error'])) {
            return $result;
        }

        return ['verified_skills' => $this->normalizeSummaryItems($result['verified_skills'] ?? null) ?? []];
    }

    public function evaluateInterviewAnswer(array $question, string $answer): array
    {
        $result = $this->requestJson(
            'You are a fair interview coach. Score this answer on accuracy, communication, confidence, technical_depth, and relevance. Return valid JSON with integer 0-100 scores for each key and concise feedback.',
            "Question: " . json_encode($question, JSON_UNESCAPED_SLASHES) . "\nApplicant answer: " . mb_substr($answer, 0, 4000),
            1200,
        );
        if (! empty($result['error'])) {
            return $result;
        }

        $scores = [];
        foreach (['accuracy', 'communication', 'confidence', 'technical_depth', 'relevance'] as $criterion) {
            if (! isset($result[$criterion]) || ! is_numeric($result[$criterion])) {
                return ['error' => 'AI returned an incomplete interview evaluation. Please retry this answer.'];
            }
            $scores[$criterion] = max(0, min(100, (int) $result[$criterion]));
        }

        return ['scores' => $scores, 'feedback' => trim((string) ($result['feedback'] ?? 'Answer evaluated.'))];
    }

    public function transcribeInterviewAudio(UploadedFile $audio): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $response = Http::timeout(90)->connectTimeout(10)->retry(1, 1500, throw: false)
            ->withToken($key)
            ->attach('file', file_get_contents($audio->getRealPath()), $audio->getClientOriginalName())
            ->post($this->base . '/audio/transcriptions', [
                'model' => env('AI_TRANSCRIPTION_MODEL', 'whisper-large-v3-turbo'),
                'response_format' => 'json',
                'language' => 'en',
            ]);

        if ($response->failed()) {
            return ['error' => $this->aiRequestError($response, 'Speech transcription failed. Please try recording again.')];
        }

        $transcript = trim((string) $response->json('text', ''));
        if ($transcript === '') {
            return ['error' => 'No speech was detected. Please try recording your answer again.'];
        }

        return ['transcript' => $transcript];
    }

    public function summarizeMockInterview(array $questions, array $answers, array $evaluations, array $job): array
    {
        $result = $this->requestJson(
            'You are an experienced hiring interviewer. Summarize this completed mock interview. Return JSON with overall_score (0-100), technical_score, communication_score, confidence_score, strengths (array), weak_areas (array), suggested_improvements (array), readiness_percentage (0-100), and recommendation (Highly Recommended|Recommended|Needs More Preparation). Base conclusions on the scored answers only.',
            "Job: " . json_encode($job, JSON_UNESCAPED_SLASHES) . "\nInterview: " . json_encode(array_map(static fn ($index) => ['question' => $questions[$index]['question'] ?? '', 'answer' => $answers[$index] ?? '', 'evaluation' => $evaluations[$index] ?? []], array_keys($questions)), JSON_UNESCAPED_SLASHES),
            1800,
        );
        if (! empty($result['error'])) {
            return $result;
        }

        foreach (['overall_score', 'technical_score', 'communication_score', 'confidence_score', 'readiness_percentage'] as $field) {
            if (! isset($result[$field]) || ! is_numeric($result[$field])) {
                return ['error' => 'AI returned an incomplete interview report. Please retry report generation.'];
            }
            $result[$field] = max(0, min(100, (int) $result[$field]));
        }
        foreach (['strengths', 'weak_areas', 'suggested_improvements'] as $field) {
            $result[$field] = $this->normalizeSummaryItems($result[$field] ?? null) ?? [];
        }
        if (! in_array($result['recommendation'] ?? '', ['Highly Recommended', 'Recommended', 'Needs More Preparation'], true)) {
            $result['recommendation'] = 'Needs More Preparation';
        }

        return ['report' => $result];
    }

    private function requestJson(string $system, string $prompt, int $maxTokens): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $response = Http::timeout(60)->connectTimeout(10)->retry(1, 1500, throw: false)->withToken($key)
            ->post($this->base . '/chat/completions', [
                'model' => env('AI_MODEL', 'openai/gpt-oss-20b'),
                'messages' => [
                    ['role' => 'system', 'content' => $system . ' Return only valid JSON.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => $maxTokens,
            ]);

        if ($response->failed()) {
            return ['error' => $this->aiRequestError($response, 'AI interview request failed.')];
        }

        $body = $response->json();
        $parsed = $this->parseJson($body['choices'][0]['message']['content'] ?? '');
        return is_array($parsed) ? $parsed : ['error' => 'AI returned an invalid interview response. Please retry.'];
    }

    private function aiRequestError(\Illuminate\Http\Client\Response $response, string $fallback): string
    {
        if ($response->status() === 429) {
            $message = (string) $response->json('error.message', '');
            if (preg_match('/try again in ([\d.]+)s/i', $message, $matches)) {
                $seconds = max(1, (int) ceil((float) $matches[1]));
                return "The AI service is busy. Wait {$seconds} seconds, then retry. Your progress is saved.";
            }
            return 'The AI service is busy. Wait a short time, then retry. Your progress is saved.';
        }

        Log::error('AI interview request failed', ['status' => $response->status()]);
        return $fallback;
    }

    public function generatePersonalizedReviewer(string $resumeText, array $questions, array $answers, array $weakTopics, ?string $feedback): array
    {
        $key = env('AI_API_KEY', env('GROQ_API_KEY'));
        if (! $key) {
            return ['error' => 'AI_API_KEY or GROQ_API_KEY not configured'];
        }

        $test = [];
        foreach ($questions as $index => $question) {
            $test[] = [
                'question' => $question['question'] ?? '',
                'answer' => mb_substr($answers[$index] ?? '', 0, 1200),
            ];
        }

        $prompt = "Create a beginner-friendly personalized study reviewer using ONLY weak topics supported by this resume assessment. Do not include topics the applicant demonstrated proficiency in. Return only valid JSON with keys topics (array). Each topic must contain title, overview, why_it_matters, core_concepts (array), examples (array), best_practices (array), common_mistakes (array), practice_questions (array of objects with type and question; include multiple choice, identification, true/false, and short answer formats), coding_exercise (string or null), interview_tips (array), and cheat_sheet (array). Keep explanations concrete and concise. Resume evidence: " . mb_substr($resumeText, 0, 12000) . "\nWeak topics: " . json_encode($weakTopics, JSON_UNESCAPED_SLASHES) . "\nEvaluation feedback: " . ($feedback ?? '') . "\nAssessment: " . json_encode($test, JSON_UNESCAPED_SLASHES);

        $response = Http::timeout(45)->connectTimeout(10)->retry(1, 2000, throw: false)->withToken($key)
            ->post($this->base . '/chat/completions', [
                'model' => env('AI_MODEL', 'openai/gpt-oss-20b'),
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a supportive technical instructor. Return only valid JSON.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 5000,
            ]);

        if ($response->failed()) {
            Log::error('AI personalized reviewer request failed', ['status' => $response->status()]);
            return ['error' => 'AI reviewer generation failed. Please try again.'];
        }

        $body = $response->json();
        $parsed = $this->parseJson($body['choices'][0]['message']['content'] ?? '');
        if (! is_array($parsed) || ! is_array($parsed['topics'] ?? null) || count($parsed['topics']) === 0) {
            return ['error' => 'AI returned an incomplete personalized reviewer. Please try again.'];
        }

        return ['reviewer' => ['topics' => array_values($parsed['topics'])]];
    }

    private function parseJson(string $output): ?array
    {
        $json = trim(preg_replace('/```(?:json)?|```/i', '', $output));
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $json, $matches)) {
            $decoded = json_decode($matches[0], true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }

    private function normalizeQuestions(mixed $questions): array
    {
        if (! is_array($questions)) {
            return [];
        }

        return array_values(array_filter(array_map(function ($item) {
            if (is_string($item)) {
                return ['question_type' => 'essay', 'question' => trim($item), 'claim' => null, 'answer_format' => 'essay', 'difficulty' => 'intermediate', 'weight' => 10];
            }

            if (is_array($item) && ! empty($item['question'])) {
                $type = $this->normalizeQuestionType($item['question_type'] ?? $item['questionType'] ?? $item['type'] ?? $item['format'] ?? null);
                if (! $type) {
                    $type = is_array($item['options'] ?? null) && count($item['options']) > 1
                        ? 'multiple_choice'
                        : (is_array($item['pairs'] ?? null) && count($item['pairs']) > 0
                            ? 'matching'
                            : (! empty($item['course']) ? 'course_specific' : (! empty($item['statement']) ? 'modified_true_false' : 'essay')));
                }

                return [
                    'question_type' => $type,
                    'question' => trim((string) $item['question']),
                    'claim' => isset($item['claim']) ? trim((string) $item['claim']) : null,
                    'options' => is_array($item['options'] ?? null) ? array_values($item['options']) : [],
                    'pairs' => is_array($item['pairs'] ?? null) ? array_values($item['pairs']) : [],
                    'statement' => isset($item['statement']) ? trim((string) $item['statement']) : null,
                    'correction_prompt' => isset($item['correction_prompt']) ? trim((string) $item['correction_prompt']) : null,
                    'course' => isset($item['course']) ? trim((string) $item['course']) : null,
                    'answer_format' => isset($item['answer_format']) ? trim((string) $item['answer_format']) : $type,
                    'difficulty' => in_array($item['difficulty'] ?? null, ['easy', 'intermediate', 'advanced'], true) ? $item['difficulty'] : 'intermediate',
                    'weight' => in_array((int) ($item['weight'] ?? 10), [5, 10, 15], true) ? (int) ($item['weight'] ?? 10) : 10,
                ];
            }

            return null;
        }, $questions)));
    }

    private function normalizeQuestionType(mixed $type): ?string
    {
        if (! is_string($type)) {
            return null;
        }

        return match (strtolower(trim(str_replace(['-', ' '], '_', $type)))) {
            'multiple_choice', 'multiplechoice', 'mcq' => 'multiple_choice',
            'modified_true_false', 'true_false', 'truefalse', 'modified_true_or_false' => 'modified_true_false',
            'matching', 'matching_type' => 'matching',
            'essay', 'essay_question', 'free_response' => 'essay',
            'course_specific', 'course_specific_question', 'specialized', 'practical' => 'course_specific',
            default => null,
        };
    }

    private function normalizeScore(mixed $score): ?float
    {
        if (is_numeric($score)) {
            return max(0, min(100, (float) $score));
        }

        return match (strtoupper(trim((string) $score))) {
            'A+', 'A' => 95,
            'A-' => 90,
            'B+' => 88,
            'B' => 85,
            'B-' => 82,
            'C+' => 78,
            'C' => 75,
            'C-' => 72,
            'D' => 65,
            'F' => 50,
            default => null,
        };
    }

    private function normalizeSummaryItems(mixed $items): ?array
    {
        if (is_array($items)) {
            return array_values(array_filter(array_map(static fn ($item) => trim((string) $item), $items)));
        }

        if (is_string($items) && trim($items) !== '') {
            $parts = preg_split('/\s*(?:;|\n|\.|\u2022)\s*/u', trim($items));
            return array_values(array_filter(array_map(static fn ($item) => trim($item), $parts ?: [])));
        }

        return null;
    }

    private function fallbackCourseQuestions(string $resumeText): array
    {
        if (preg_match('/information technology|software|programming|php|laravel|javascript|python|sql|database|web development/i', $resumeText)) {
            return [
                ['question_type' => 'course_specific', 'question' => 'Write a short function that validates an email address.', 'claim' => 'Programming or web development', 'course' => 'Information Technology', 'answer_format' => 'code', 'difficulty' => 'intermediate', 'weight' => 10],
                ['question_type' => 'course_specific', 'question' => 'A Laravel route returns 404. List two checks you would perform.', 'claim' => 'Laravel or web development', 'course' => 'Information Technology', 'answer_format' => 'technical response', 'difficulty' => 'intermediate', 'weight' => 10],
                ['question_type' => 'course_specific', 'question' => 'Write SQL to find duplicate email values in a users table.', 'claim' => 'SQL or database skills', 'course' => 'Information Technology', 'answer_format' => 'code', 'difficulty' => 'advanced', 'weight' => 15],
            ];
        }

        if (preg_match('/engineering|mechanical|civil|electrical|chemical/i', $resumeText)) {
            return [
                ['question_type' => 'course_specific', 'question' => 'Solve one documented engineering problem and show your equation.', 'claim' => 'Engineering education or experience', 'course' => 'Engineering', 'answer_format' => 'equation', 'difficulty' => 'intermediate', 'weight' => 10],
                ['question_type' => 'course_specific', 'question' => 'Describe the design assumptions for one documented engineering project.', 'claim' => 'Engineering project', 'course' => 'Engineering', 'answer_format' => 'technical response', 'difficulty' => 'intermediate', 'weight' => 10],
                ['question_type' => 'course_specific', 'question' => 'Explain how you would validate the safety of a documented design.', 'claim' => 'Engineering practice', 'course' => 'Engineering', 'answer_format' => 'technical response', 'difficulty' => 'advanced', 'weight' => 15],
            ];
        }

        return [
            ['question_type' => 'course_specific', 'question' => 'Explain one core concept from the field documented in your education.', 'claim' => 'Documented education', 'course' => 'Field-specific', 'answer_format' => 'technical response', 'difficulty' => 'easy', 'weight' => 5],
            ['question_type' => 'course_specific', 'question' => 'Apply a concept from your documented field to a realistic work scenario.', 'claim' => 'Documented field experience', 'course' => 'Field-specific', 'answer_format' => 'technical response', 'difficulty' => 'intermediate', 'weight' => 10],
            ['question_type' => 'course_specific', 'question' => 'Solve a practical problem related to the field documented in your resume.', 'claim' => 'Documented field', 'course' => 'Field-specific', 'answer_format' => 'technical response', 'difficulty' => 'advanced', 'weight' => 15],
        ];
    }
}
