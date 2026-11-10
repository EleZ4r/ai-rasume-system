<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;

class ResumeDocumentValidator
{
    public function rejectionReason(UploadedFile $file): ?string
    {
        try {
            $text = (new Parser())->parseFile($file->getRealPath())->getText();
        } catch (\Throwable $exception) {
            Log::warning('Could not parse uploaded resume PDF', [
                'exception' => $exception->getMessage(),
            ]);

            return 'This PDF could not be read. Upload a text-based PDF resume rather than a damaged or scanned PDF.';
        }

        $normalizedText = mb_strtolower(preg_replace('/\s+/u', ' ', $text) ?? '');
        $readableText = preg_replace('/[^\p{L}\p{N}]/u', '', $normalizedText) ?? '';
        if (mb_strlen($readableText) < 150) {
            return 'This PDF has too little readable text to verify as a resume. Upload a text-based PDF with your experience, skills, or education.';
        }

        $hasContactInformation = preg_match('/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i', $normalizedText)
            || preg_match('/(?:\+?\d[\d\s().-]{7,}\d)/', $normalizedText)
            || str_contains($normalizedText, 'linkedin.com');

        $sectionHeadings = array_filter(array_map(
            static fn (string $line): string => mb_strtolower(trim($line)),
            preg_split('/\R/u', $text) ?: [],
        ));
        $resumeSections = [
            '/^(?:professional\s+)?(?:experience|employment|work\s+experience|work\s+history|professional\s+history|career\s+history|internships?)(?:\s*:)?$/u',
            '/^(?:education|academic(?:\s+background)?|qualifications|certifications?)(?:\s*:)?$/u',
            '/^(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|proficiencies)(?:\s*:)?$/u',
            '/^(?:selected\s+)?(?:projects|portfolio|selected\s+work)(?:\s*:)?$/u',
        ];
        $matchingSections = count(array_filter(
            $resumeSections,
            static fn (string $pattern): bool => count(array_filter(
                $sectionHeadings,
                static fn (string $line): bool => preg_match($pattern, $line) === 1,
            )) > 0,
        ));

        if (! $hasContactInformation || $matchingSections < 2) {
            return 'This PDF does not look like a resume. Include contact information and at least two sections such as experience, education, skills, or projects.';
        }

        return null;
    }
}
