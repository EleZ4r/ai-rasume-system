<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->longText('reviewer_basis')->nullable()->after('suggestions');
            $table->json('verification_questions')->nullable()->after('reviewer_basis');
        });
    }

    public function down(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->dropColumn(['reviewer_basis', 'verification_questions']);
        });
    }
};