@extends('admin.layout')

@section('title', 'Interview reviews')

@section('content')
<div class="page-heading"><div><div class="eyebrow">Human resources</div><h1>Interview reviews</h1><p>Review completed mock interviews and record hiring decisions.</p></div></div>
<section class="card">
    <div class="section-title"><span>Interview queue</span><div class="filters"><span class="muted">{{ $pendingCount }} awaiting review</span><a class="button secondary" href="{{ route('admin.interviews') }}">All</a><a class="button secondary" href="{{ route('admin.interviews', ['status' => 'pending']) }}">Pending</a></div></div>
    <p class="table-scroll-hint">Swipe horizontally to see all columns.</p>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Applicant</th><th>Position</th><th>Score</th><th>Interview status</th><th>HR decision</th><th>Date</th><th></th></tr></thead><tbody>
        @forelse($interviews as $interview)
            <tr><td class="primary-cell"><a class="subtle-link" href="{{ route('admin.applicants.show', $interview->application->user) }}">{{ $interview->application->user->name }}</a></td><td>{{ $interview->application->job->title }}<div class="secondary-cell">{{ $interview->application->job->company }}</div></td><td>{{ data_get($interview->report, 'overall_score', '—') }}</td><td><span class="status {{ $interview->status }}">{{ str_replace('_', ' ', $interview->status) }}</span></td><td>@if($interview->review_decision)<span class="status {{ $interview->review_decision }}">{{ $interview->review_decision }}</span>@else<span class="muted">Pending</span>@endif</td><td>{{ $interview->created_at->format('M j, Y') }}</td><td><a class="subtle-link" href="{{ route('admin.interviews.show', $interview) }}">Review →</a></td></tr>
        @empty
            <tr><td colspan="7" class="muted">No mock interviews found.</td></tr>
        @endforelse
    </tbody></table></div>
    <div class="pagination">{{ $interviews->links() }}</div>
</section>
@endsection
