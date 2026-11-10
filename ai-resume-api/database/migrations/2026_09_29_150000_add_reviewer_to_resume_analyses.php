<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->json('verification_weak_topics')->nullable();
            $table->json('personalized_reviewer')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->dropColumn(['verification_weak_topics', 'personalized_reviewer']);
        });
    }
};