@extends('admin.layout')

@section('title', 'Applicant profile')

@section('content')
<div class="page-heading">
    <div>
        <div class="eyebrow"><a class="subtle-link" href="{{ route('admin.applicants') }}">Applicants</a> / Profile</div>
        <div class="applicant-heading">
            <span class="applicant-avatar">{{ strtoupper(substr($applicant->name, 0, 1)) }}</span>
            <div>
                <h1>{{ $applicant->name }}</h1>
                <div class="profile-meta">
                    <a href="mailto:{{ $applicant->email }}">{{ $applicant->email }}</a>
                    <span>·</span>
                    <span>Joined {{ $applicant->created_at->format('M j, Y') }}</span>
                    <span>·</span>
                    <span>{{ $applicant->email_verified_at ? 'Email verified' : 'Email not verified' }}</span>
                </div>
            </div>
        </div>
    </div>
    <a class="button secondary" href="{{ route('admin.applicants') }}">← All applicants</a>
</div>

<div class="grid stats">
    <section class="card"><div class="stat-label">Resumes</div><div class="stat-value">{{ number_format($applicant->resumes->count()) }}</div><div class="stat-detail">Submitted to this account</div></section>
    <section class="card"><div class="stat-label">Applications</div><div class="stat-value">{{ number_format($applicant->applications->count()) }}</div><div class="stat-detail">Across all job listings</div></section>
    <section class="card"><div class="stat-label">Interviews</div><div class="stat-value">{{ number_format($applicant->applications->sum(fn ($application) => $application->mockInterviews->count())) }}</div><div class="stat-detail">Mock interviews started</div></section>
    <section class="card"><div class="stat-label">Account status</div><div class="stat-value" style="font-size:19px">{{ $applicant->email_verified_at ? 'Verified' : 'Unverified' }}</div><div class="stat-detail">Email address</div></section>
</div>

<div class="grid section-grid">
    <div class="panel-stack">
        <section class="card">
            <h2 class="section-title">Resumes <span class="muted">{{ $applicant->resumes->count() }} total</span></h2>
            @forelse($applicant->resumes as $resume)
                @php($analysis = $resume->resumeAnalyses->first())
                <article class="answer-card">
                    <div class="resume-header">
                        <div>
                            <h3 style="margin:0 0 6px;font-size:13px">{{ $resume->filename }}</h3>
                            <div class="muted">Uploaded {{ $resume->created_at->format('M j, Y') }} · <span class="status {{ $resume->status }}">{{ str_replace('_', ' ', $resume->status) }}</span></div>
                        </div>
                        <a class="button secondary" href="{{ route('admin.resumes.file', $resume) }}" target="_blank" rel="noopener">Open PDF ↗</a>
                    </div>

                    @if($analysis)
                        <div class="analysis-columns">
                            <div>
                                <h4 class="analysis-title">Resume analysis</h4>
                                <div class="resume-score">{{ $analysis->score !== null ? number_format($analysis->score, 0) : '—' }}<small> / 100</small></div>
                            </div>
                            <div>
                                <h4 class="analysis-title">Skill verification</h4>
                                <span class="status {{ $analysis->verification_status }}">{{ str_replace('_', ' ', $analysis->verification_status ?: 'not started') }}</span>
                                @if($analysis->verification_score !== null)<div class="muted" style="margin-top:7px">Score: {{ $analysis->verification_score }} / 100</div>@endif
                            </div>
                            @if($analysis->strengths)
                                <div><h4 class="analysis-title">Strengths</h4><ul class="analysis-list">@foreach($analysis->strengths as $strength)<li>{{ $strength }}</li>@endforeach</ul></div>
                            @endif
                            @if($analysis->weaknesses)
                                <div><h4 class="analysis-title">Areas to improve</h4><ul class="analysis-list">@foreach($analysis->weaknesses as $weakness)<li>{{ $weakness }}</li>@endforeach</ul></div>
                            @endif
                            @if($analysis->verified_skills)
                                <div style="grid-column:1/-1"><h4 class="analysis-title">Verified skills</h4><div class="skill-list">@foreach($analysis->verified_skills as $skill)<span class="skill">{{ is_array($skill) ? data_get($skill, 'name', json_encode($skill)) : $skill }}</span>@endforeach</div></div>
                            @endif
                            @if($analysis->suggestions)
                                <div style="grid-column:1/-1"><h4 class="analysis-title">Suggestions</h4><ul class="analysis-list">@foreach($analysis->suggestions as $suggestion)<li>{{ $suggestion }}</li>@endforeach</ul></div>
                            @endif
                        </div>
                    @else
                        <p class="muted" style="margin:14px 0 0">No analysis is available for this resume yet.</p>
                    @endif

                    @if($resume->text)
                        <details>
                            <summary class="text-toggle">View extracted resume text</summary>
                            <div class="resume-text">{{ $resume->text }}</div>
                        </details>
                    @endif
                </article>
            @empty
                <p class="muted">This applicant has not uploaded a resume yet.</p>
            @endforelse
        </section>
    </div>

    <div class="panel-stack">
        <section class="card">
            <h2 class="section-title">Applications <span class="muted">{{ $applicant->applications->count() }} total</span></h2>
            <div class="plain-list">
                @forelse($applicant->applications as $application)
                    <article class="application-item">
                        <div class="application-top">
                            <div><div class="application-title">{{ $application->job->title }}</div><div class="application-subtitle">{{ $application->job->company }} · Applied {{ $application->created_at->format('M j, Y') }}</div></div>
                            <span class="status {{ $application->status }}">{{ str_replace('_', ' ', $application->status) }}</span>
                        </div>
                        @foreach($application->mockInterviews as $interview)
                            <div class="interview-meta">
                                <span class="muted">Interview · {{ $interview->created_at->format('M j, Y') }}</span>
                                <span class="status {{ $interview->status }}">{{ str_replace('_', ' ', $interview->status) }}</span>
                                @if($interview->review_decision)<span class="status {{ $interview->review_decision }}">{{ $interview->review_decision }}</span>@endif
                                @if(data_get($interview->report, 'overall_score') !== null)<span class="muted">Score {{ data_get($interview->report, 'overall_score') }}</span>@endif
                                <a class="subtle-link" href="{{ route('admin.interviews.show', $interview) }}">Review →</a>
                            </div>
                        @endforeach
                    </article>
                @empty
                    <p class="muted">This applicant has not applied to any jobs yet.</p>
                @endforelse
            </div>
        </section>

        <section class="card">
            <h2 class="section-title">Account details</h2>
            <div class="detail-item"><div class="detail-label">Full name</div><div class="detail-value">{{ $applicant->name }}</div></div>
            <div class="detail-item"><div class="detail-label">Email address</div><div class="detail-value"><a href="mailto:{{ $applicant->email }}">{{ $applicant->email }}</a></div></div>
            <div class="detail-item"><div class="detail-label">Account created</div><div class="detail-value">{{ $applicant->created_at->format('F j, Y \a\t g:i A') }}</div></div>
            <div class="detail-item"><div class="detail-label">Email verification</div><div class="detail-value">{{ $applicant->email_verified_at ? $applicant->email_verified_at->format('M j, Y') : 'Not verified' }}</div></div>
        </section>
    </div>
</div>
@endsection
