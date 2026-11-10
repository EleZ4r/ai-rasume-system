@extends('admin.layout')

@section('title', 'Overview')

@section('content')
<div class="page-heading"><div><div class="eyebrow">Dashboard</div><h1>Good {{ now()->format('A') === 'AM' ? 'morning' : 'afternoon' }}, {{ auth()->user()->name }}</h1><p>Here’s what’s happening across your hiring workspace.</p></div><a class="button" href="{{ route('admin.jobs') }}">Manage job listings&nbsp; →</a></div>

<div class="grid stats">
    @foreach($stats as $stat)
        @if($stat['label'] === 'Total applicants')
            <a class="card" href="{{ route('admin.applicants') }}"><div class="stat-label">{{ $stat['label'] }}</div><div class="stat-value">{{ number_format($stat['value']) }}</div><div class="stat-detail">{{ $stat['detail'] }} · View directory →</div></a>
        @else
            <section class="card"><div class="stat-label">{{ $stat['label'] }}</div><div class="stat-value">{{ number_format($stat['value']) }}</div><div class="stat-detail">{{ $stat['detail'] }}</div></section>
        @endif
    @endforeach
</div>

<div class="grid section-grid" style="margin-bottom:19px">
    <section class="card">
        <h2 class="section-title">Application activity <a class="subtle-link" href="{{ route('admin.reports') }}">View reports →</a></h2>
        @php($maxApplications = max(collect($applicationTrend)->max('value'), 1))
        <div class="chart" role="img" aria-label="Applications by month">
            @foreach($applicationTrend as $month)
                <div class="bar-item"><span class="bar-value">{{ $month['value'] ?: '' }}</span><div class="bar" style="height:{{ max(($month['value'] / $maxApplications) * 75, 2) }}%"></div><span class="bar-label">{{ $month['label'] }}</span></div>
            @endforeach
        </div>
    </section>
    <section class="card">
        <h2 class="section-title">Top job listings <a class="subtle-link" href="{{ route('admin.jobs') }}">All listings →</a></h2>
        @forelse($activeJobs as $job)
            <div class="job-line"><div class="job-logo">{{ strtoupper(substr($job->company, 0, 1)) }}</div><div class="job-copy"><div class="job-title">{{ $job->title }}</div><div class="job-company">{{ $job->company }}</div></div><span class="job-count">{{ $job->applications_count }} applicants</span></div>
        @empty
            <p class="muted">No job listings yet. Add a listing to start receiving applications.</p>
        @endforelse
    </section>
</div>

<section class="card">
    <h2 class="section-title">Recent applications <a class="subtle-link" href="{{ route('admin.reports') }}">Explore reports →</a></h2>
    <p class="table-scroll-hint">Swipe horizontally to see all columns.</p>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Applicant</th><th>Position</th><th>Applied</th><th>Status</th></tr></thead><tbody>
        @forelse($recentApplications as $application)
            <tr><td class="primary-cell"><a class="subtle-link" href="{{ route('admin.applicants.show', $application->user) }}">{{ $application->user->name }}</a></td><td>{{ $application->job->title }}<div class="secondary-cell">{{ $application->job->company }}</div></td><td>{{ $application->created_at->format('M j, Y') }}</td><td><span class="status {{ $application->status }}">{{ str_replace('_', ' ', $application->status) }}</span></td></tr>
        @empty
            <tr><td colspan="4" class="muted">No applications have been submitted yet.</td></tr>
        @endforelse
    </tbody></table></div>
</section>
@endsection
