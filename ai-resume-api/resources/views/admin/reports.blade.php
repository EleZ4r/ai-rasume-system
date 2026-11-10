@extends('admin.layout')

@section('title', 'Reports')

@section('content')
<div class="page-heading"><div><div class="eyebrow">Analytics</div><h1>Reports</h1><p>Track applicant activity and hiring pipeline performance over the past 12 months.</p></div></div>
<div class="grid report-cards">
    @foreach(['applicants' => 'Registered applicants', 'resumes' => 'Resumes uploaded', 'applications' => 'Total applications', 'interviews' => 'Mock interviews'] as $key => $label)
        <section class="card"><div class="stat-label">{{ $label }}</div><div class="stat-value">{{ number_format($totals[$key]) }}</div><div class="stat-detail">All time</div></section>
    @endforeach
</div>
<div class="grid report-grid">
    @foreach([['title' => 'Applications', 'data' => $monthlyApplications], ['title' => 'New applicants', 'data' => $monthlyUsers], ['title' => 'Resumes uploaded', 'data' => $monthlyResumes]] as $chart)
        <section class="card"><h2 class="section-title">{{ $chart['title'] }} <span class="muted">Last 12 months</span></h2>
            @php($maxValue = max(collect($chart['data'])->max('value'), 1))
            <div class="chart" role="img" aria-label="{{ $chart['title'] }} by month">
                @foreach($chart['data'] as $month)
                    <div class="bar-item"><span class="bar-value">{{ $month['value'] ?: '' }}</span><div class="bar" style="height:{{ max(($month['value'] / $maxValue) * 75, 2) }}%"></div><span class="bar-label">{{ $month['label'] }}</span></div>
                @endforeach
            </div>
        </section>
    @endforeach
    <section class="card"><h2 class="section-title">Application pipeline</h2>
        @forelse($applicationStatuses as $item)
            <div class="status-row"><span class="status {{ $item->status }}">{{ str_replace('_', ' ', $item->status) }}</span><strong>{{ number_format($item->total) }}</strong></div>
        @empty
            <p class="muted">Application status data will appear here as applicants apply.</p>
        @endforelse
    </section>
</div>
@endsection
