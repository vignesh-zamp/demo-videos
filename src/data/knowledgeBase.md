# Deviation Trend Intelligence — Knowledge Base

## Overview

Deviation Trend Intelligence is Amgen's AI-powered system for analyzing non-conformance (NC) records
across the global manufacturing network. It uses semantic analysis to identify patterns, clusters,
and emerging risks that manual review consistently misses.

## What Is a Deviation (NC)?

A deviation (also called a Non-Conformance or NC) is any departure from an approved procedure,
specification, or established standard during pharmaceutical manufacturing. Examples include:
- Equipment operating outside validated parameters (temperature, pressure, pH)
- Environmental monitoring excursions (microbial contamination in cleanrooms)
- Cleaning validation failures (residual protein above acceptance limits)
- Filter integrity test failures
- Raw material out-of-specification results

Every NC is documented in TrackWise with an initiation form, investigation, root cause analysis,
and corrective/preventive action (CAPA).

## Systems Involved

| System | Purpose | Data Used |
|--------|---------|-----------|
| **TrackWise** | Quality Management System (QMS) | NC records, CAPA records, investigation narratives |
| **SAP (ERP)** | Enterprise Resource Planning | Batch records, material lot numbers, procurement data |
| **SAP PM** | Plant Maintenance | Equipment maintenance history, calibration records, work orders |
| **SAP MM** | Materials Management | Vendor data, purchase orders, material specifications |
| **LIMS** | Lab Information Management | Environmental monitoring data, test results, titer measurements |
| **PI/OSIsoft** | Process Historian | Real-time sensor data (temperature, pH, dissolved oxygen, pressure) |
| **Veeva Vault** | Document Management | SOPs, validation protocols, batch record templates |
| **ComplianceWire** | Learning Management | Training records, qualification status |

## How Pace Analyzes Deviations

### Step 1: NC Intake
When a new NC is filed in TrackWise, Pace reads the initiation form including the free-text
Event Description field — the richest source of investigative context.

### Step 2: Semantic Analysis
Pace extracts the failure mode, equipment involved, environmental conditions, and process
parameters from the narrative text. This goes beyond TrackWise dropdown categories which
often vary by site (e.g., "Temperature Excursion" at ATO vs "Process Parameter OOS" at PR).

### Step 3: Historical Matching
Pace queries the full TrackWise database (18,000+ NCs across all sites) using semantic
similarity scoring — not keyword matching. This catches related NCs filed under different
category codes or described with different terminology.

### Step 4: Cross-System Correlation
For each cluster of similar NCs, Pace pulls:
- Equipment maintenance records from SAP PM
- Material/vendor data from SAP MM
- Process sensor data from PI/OSIsoft
- Lab results from LIMS
- Training records from ComplianceWire

### Step 5: Pattern Recognition
Pace identifies:
- **Vendor-linked clusters**: Multiple NCs traced to a single supplier change
- **Equipment drift patterns**: Gradual degradation visible in historian data
- **Site-specific gaps**: One site behind on CAPA propagation from another
- **Emerging weak signals**: Statistical patterns below confidence threshold that match
  historical precursors to major events

### Step 6: Intelligence Delivery
Pace generates:
- Cross-Site Trend Alert Reports
- CAPA Propagation Recommendations
- Investigation Assist Packages (bundled evidence from all systems)
- Risk Score Escalations (when pattern matches historical major events)

## Key Metrics

- **NC Volume**: ~18,400 NCs across 4 major sites in trailing 24 months
- **Average Investigation Time**: 30-60 days (industry standard)
- **Data Gathering Share**: ~60% of investigation time spent collecting evidence
- **Pace Target**: Reduce evidence gathering from days to minutes
- **Cluster Detection**: Semantic matching finds 3-5x more related NCs than keyword search

## Sites in Network

| Site | Code | Products | Maturity |
|------|------|----------|----------|
| Thousand Oaks, CA | ATO | Repatha, Aimovig, Blincyto | Established (30+ years) |
| Dun Laoghaire, Ireland | IRE | Enbrel, Prolia | Established (20+ years) |
| Juncos, Puerto Rico | PR | Prolia, XGEVA, Neulasta | Established (25+ years) |
| New Albany, Ohio | OH | Lumakras, TEZSPIRE | New (opened Feb 2024) |

## Deviation Classification

| Level | Definition | Investigation Timeline |
|-------|-----------|----------------------|
| **Minor** | No product impact, documentation gap | 30 days |
| **Major** | Potential product impact, requires root cause | 45 days |
| **Critical** | Confirmed product impact or patient safety risk | Immediate escalation |

## CAPA Propagation

When a CAPA proves effective at one site (measured by reduction in recurrence rate),
Pace evaluates whether the same fix should be propagated to other sites by:
1. Checking if other sites have similar NCs
2. Comparing SOP versions across sites (via Veeva Vault)
3. Checking training currency (via ComplianceWire)
4. Generating a propagation recommendation with evidence

## Risk Scoring

Pace maintains a dynamic risk score (0-100) per equipment/area that considers:
- NC frequency (recent vs historical)
- Severity trend (escalating or stable)
- Pattern match to historical major events
- Time since last maintenance/calibration
- Training currency of operators

Scores above 75 trigger automatic escalation recommendations.

## Frequently Asked Questions

**Q: How does Pace handle NCs filed under different category codes?**
A: Pace uses semantic similarity on the free-text Event Description, not the dropdown
category. This catches NCs that describe the same failure mode but use different
classification terminology across sites.

**Q: What happens when statistical confidence is low?**
A: Pace flags moderate-confidence patterns (p=0.05-0.10) as "emerging signals" and
compares them against historical precursors. If a pattern matches a known sequence
that previously led to a major event, it recommends escalation even at lower confidence.

**Q: Can Pace access real-time sensor data?**
A: Yes, via the PI/OSIsoft historian integration. Pace pulls time-series data for
relevant parameters (temperature, pH, dissolved oxygen, pressure) over configurable
windows (typically 24-hour to 60-day).

**Q: How does the system handle the Ohio site's higher NC rate?**
A: Pace benchmarks against maturity-adjusted rates. A new site at 6 months of operation
is expected to run 30-50% above the network average. The system flags if the rate
exceeds the maturity-adjusted threshold or if specific failure modes indicate
systemic issues vs. normal commissioning activity.
