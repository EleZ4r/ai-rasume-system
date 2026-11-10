<?php

namespace App\Services;

use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIO;
use Illuminate\Support\Facades\Storage;

class DocumentExtractor
{
    public function extractText(string $storagePath): string
    {
        $local = Storage::path($storagePath);
        $ext = strtolower(pathinfo($local, PATHINFO_EXTENSION));

        try {
            if (in_array($ext, ['pdf'])) {
                $parser = new PdfParser();
                $pdf = $parser->parseFile($local);
                return $pdf->getText();
            }

            if (in_array($ext, ['docx', 'doc'])) {
                $phpWord = WordIO::load($local);
                $text = '';
                foreach ($phpWord->getSections() as $section) {
                    $elements = $section->getElements();
                    foreach ($elements as $el) {
                        if (method_exists($el, 'getText')) {
                            $text .= $el->getText() . "\n";
                        }
                    }
                }
                return $text;
            }
        } catch (\Exception $e) {
            return '';
        }

        // Never return binary document contents as text; that breaks JSON responses.
        return '';
    }
}
