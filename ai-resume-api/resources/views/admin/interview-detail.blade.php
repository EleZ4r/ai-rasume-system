@extends('admin.layout')

@section('title', 'Interview review')

@section('content')
<div class="page-heading"><div><div class="eyebrow"><a class="subtle-link" href="{{ route('admin.interviews') }}">Interview reviews</a> / Review</div><h1>{{ $interview->application->user->name }}</h1><p>{{ $interview->application->job->title }} at {{ $interview->application->job->company }}</p></div><span class="status {{ $interview->status }}">{{ str_replace('_', ' ', $interview->status) }}</span></div>
<div class="grid section-grid">
    <div class="panel-stack">
        <section class="card"><h2 class="section-title">Applicant and interview</h2><div class="grid detail-grid">
            <div class="detail-item"><div class="detail-label">Applicant</div><div class="detail-value">{{ $interview->application->user->name }}</div></div>
            <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">{{ $interview->application->user->email }}</div></div>
            <div class="detail-item"><div class="detail-label">Resume</div><div class="detail-value">{{ $interview->application->resume->filename }}</div></div>
            <div class="detail-item"><div class="detail-label">Interview score</div><div class="detail-value">{{ data_get($interview->report, 'overall_score', 'Not available') }}</div></div>
        </div>
        @if($interview->review_decision)<div style="margin-top:16px"><span class="status {{ $interview->review_decision }}">{{ $interview->review_decision }}</span> <span class="muted">Reviewed {{ optional($interview->reviewed_at)->format('M j, Y') }}</span></div>@if($interview->review_note)<p class="muted">{{ $interview->review_note }}</p>@endif @endif
        </section>
        <section class="card"><h2 class="section-title">Interview questions and answers</h2>
            @forelse($interview->questions ?? [] as $index => $question)
                <div class="answer-card"><h3>Question {{ $index + 1 }}</h3><p>{{ is_array($question) ? data_get($question, 'question', json_encode($question)) : $question }}</p>
                    @if(data_get($interview->answers, $index))<p style="margin-top:10px"><strong>Answer</strong><br>{{ data_get($interview->answers, $index) }}</p>@endif
                    @if(data_get($interview->evaluations, $index))<p style="margin-top:10px"><strong>Evaluation</strong><br>{{ is_array(data_get($interview->evaluations, $index)) ? json_encode(data_get($interview->evaluations, $index), JSON_PRETTY_PRINT) : data_get($interview->evaluations, $index) }}</p>@endif
                </div>
            @empty
                <p class="muted">No interview questions available.</p>
            @endforelse
        </section>
    </div>
    <section class="card">
        <h2 class="section-title">HR decision</h2>
        @if($interview->status === 'completed')
            <form method="POST" action="{{ route('admin.interviews.decision', $interview) }}" class="panel-stack">@csrf
                <div class="field"><label for="decision">Decision</label><select id="decision" name="decision" required><option value="">Select a decision</option><option value="passed" @selected($interview->review_decision === 'passed')>Pass</option><option value="rejected" @selected($interview->review_decision === 'rejected')>Reject</option></select></div>
                <div class="field"><label for="note">Review notes</label><textarea id="note" name="note" maxlength="3000" placeholder="Add context for this decision">{{ old('note', $interview->review_note) }}</textarea></div>
                <button class="button" type="submit">Save decision</button>
            </form>
        @else
            <p class="muted">This interview must be completed before an HR decision can be recorded.</p>
        @endif
    </section>
</div>
@endsection
