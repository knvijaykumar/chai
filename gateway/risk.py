"""Risk assessment module for the PS-02 Privacy Gateway.

Assigns deterministic risk scores, severity levels, and actionable compliance
recommendations for detected PII entities and entire documents under the
Digital Personal Data Protection (DPDP) Act framework.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .contracts import Entity, ProcessResult

RiskLevel = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# Baseline risk definitions per entity type based on DPDP sensitivity with official portal references
ENTITY_RISK_SPECS: dict[str, dict] = {
    "AADHAAR": {
        "score": 95,
        "level": "CRITICAL",
        "recommendation": "Verify Aadhaar details and correct inaccurate information through the official UIDAI Aadhaar update service.",
        "portal_name": "UIDAI Aadhaar update service",
        "portal_url": "https://myaadhaar.uidai.gov.in/",
    },
    "PAN": {
        "score": 85,
        "level": "HIGH",
        "recommendation": "Verify PAN details and update incorrect personal information through the Income Tax e-Filing portal.",
        "portal_name": "Income Tax e-Filing portal",
        "portal_url": "https://eportal.incometax.gov.in/",
    },
    "PASSPORT": {
        "score": 85,
        "level": "HIGH",
        "recommendation": "Check passport details and request corrections through the Passport Seva portal.",
        "portal_name": "Passport Seva portal",
        "portal_url": "https://www.passportindia.gov.in/",
    },
    "VOTER_ID": {
        "score": 75,
        "level": "HIGH",
        "recommendation": "Verify electoral details and submit corrections through the Election Commission voter services portal.",
        "portal_name": "Election Commission voter services portal",
        "portal_url": "https://voters.eci.gov.in/",
    },
    "PHONE": {
        "score": 60,
        "level": "MEDIUM",
        "recommendation": "Check suspicious mobile connections registered in your name through the DoT Sanchar Saathi portal.",
        "portal_name": "DoT Sanchar Saathi portal",
        "portal_url": "https://sancharsaathi.gov.in/",
    },
    "GSTIN": {
        "score": 70,
        "level": "MEDIUM",
        "recommendation": "Verify GSTIN registration status and taxpayer filing details through the official GST Services portal.",
        "portal_name": "GST Services portal",
        "portal_url": "https://services.gst.gov.in/services/searchtp",
    },
    "EMAIL": {
        "score": 55,
        "level": "MEDIUM",
        "recommendation": "Report fraudulent communications and verify cyber incident advisories through the National Cyber Crime reporting portal.",
        "portal_name": "National Cyber Crime reporting portal",
        "portal_url": "https://cybercrime.gov.in/",
    },
    "ADDRESS": {
        "score": 50,
        "level": "MEDIUM",
        "recommendation": "Validate and update communication address with valid proof documents through the official UIDAI Address Update service.",
        "portal_name": "UIDAI Address Update service",
        "portal_url": "https://myaadhaar.uidai.gov.in/",
    },
    "PERSON": {
        "score": 45,
        "level": "LOW",
        "recommendation": "Verify personal identity records and review data protection compliance via the official MeitY Digital India portal.",
        "portal_name": "MeitY Digital India portal",
        "portal_url": "https://www.digitalindia.gov.in/",
    },
}

DEFAULT_RISK_SPEC = {
    "score": 40,
    "level": "LOW",
    "recommendation": "Verify sensitive personal data handling standards through the official MeitY Data Protection guidelines.",
    "portal_name": "MeitY Data Protection guidelines",
    "portal_url": "https://www.meity.gov.in/",
}


@dataclass(frozen=True)
class EntityRisk:
    """Risk assessment for a single detected PII finding."""

    category: str
    original_value: str
    risk_score: int
    risk_level: RiskLevel
    recommendation: str
    confidence: float | None
    source_detector: str
    start: int
    end: int
    source_location: str
    review_status: str
    portal_name: str | None = None
    portal_url: str | None = None
    source_page: int | None = None
    source_page_display: str = "N/A"

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "original_value": self.original_value,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "recommendation": self.recommendation,
            "confidence": self.confidence,
            "source_detector": self.source_detector,
            "start": self.start,
            "end": self.end,
            "source_location": self.source_location,
            "review_status": self.review_status,
            "portal_name": self.portal_name,
            "portal_url": self.portal_url,
            "source_page": self.source_page,
            "source_page_display": self.source_page_display,
        }


@dataclass(frozen=True)
class DocumentRiskSummary:
    """Document-level risk score and processing summary."""

    overall_risk_score: int
    overall_risk_level: RiskLevel
    findings: list[EntityRisk]
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    summary_text: str

    def to_dict(self) -> dict:
        return {
            "overall_risk_score": self.overall_risk_score,
            "overall_risk_level": self.overall_risk_level,
            "total_findings": self.total_findings,
            "critical_count": self.critical_count,
            "high_count": self.high_count,
            "medium_count": self.medium_count,
            "low_count": self.low_count,
            "summary_text": self.summary_text,
            "findings": [f.to_dict() for f in self.findings],
        }


def assess_entity_risk(entity: Entity, review_status: str = "MASKED & VERIFIED") -> EntityRisk:
    """Assign individual risk score, severity, and recommendation to an entity."""
    spec = ENTITY_RISK_SPECS.get(entity.type.upper(), DEFAULT_RISK_SPEC)
    
    # Clearly handle confidence score: if entity.score is available (> 0), use it
    conf = round(float(entity.score), 3) if hasattr(entity, "score") and entity.score is not None else None

    location = f"Offset {entity.start}-{entity.end}"
    page_num = getattr(entity, "page", None)
    page_display = f"Page {page_num}" if page_num is not None else "N/A"

    return EntityRisk(
        category=entity.type,
        original_value=entity.text,
        risk_score=spec["score"],
        risk_level=spec["level"],
        recommendation=spec["recommendation"],
        confidence=conf,
        source_detector=getattr(entity, "source", "unknown"),
        start=entity.start,
        end=entity.end,
        source_location=location,
        review_status=review_status,
        portal_name=spec.get("portal_name"),
        portal_url=spec.get("portal_url"),
        source_page=page_num,
        source_page_display=page_display,
    )


def assess_document_risk(result: ProcessResult) -> DocumentRiskSummary:
    """Compute overall document risk score and summarize findings."""
    if not result.entities:
        return DocumentRiskSummary(
            overall_risk_score=0,
            overall_risk_level="LOW",
            findings=[],
            total_findings=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            summary_text="No personal data detected. Zero privacy risk identified.",
        )

    review_status = "MASKED & VERIFIED"
    if result.blocked:
        review_status = "BLOCKED BY LEAK GUARD"
    elif result.needs_correction:
        review_status = "VALIDATION FAILED"

    findings = [assess_entity_risk(e, review_status=review_status) for e in result.entities]

    crit_cnt = sum(1 for f in findings if f.risk_level == "CRITICAL")
    high_cnt = sum(1 for f in findings if f.risk_level == "HIGH")
    med_cnt = sum(1 for f in findings if f.risk_level == "MEDIUM")
    low_cnt = sum(1 for f in findings if f.risk_level == "LOW")

    # Document risk score: maximum entity risk score + diversity bonus
    distinct_types = len({f.category for f in findings})
    base_score = max(f.risk_score for f in findings)
    overall_score = min(100, base_score + (distinct_types - 1) * 3)

    if overall_score >= 90:
        doc_level: RiskLevel = "CRITICAL"
    elif overall_score >= 70:
        doc_level = "HIGH"
    elif overall_score >= 45:
        doc_level = "MEDIUM"
    else:
        doc_level = "LOW"

    summary_text = (
        f"Document contains {len(findings)} sensitive finding(s) across {distinct_types} distinct category/ies. "
        f"Overall risk evaluated as {doc_level} (Score {overall_score}/100). "
        f"{'Sanitization and leak prevention verified.' if not result.blocked and not result.needs_correction else 'Processing incomplete or blocked.'}"
    )

    return DocumentRiskSummary(
        overall_risk_score=overall_score,
        overall_risk_level=doc_level,
        findings=findings,
        total_findings=len(findings),
        critical_count=crit_cnt,
        high_count=high_cnt,
        medium_count=med_cnt,
        low_count=low_cnt,
        summary_text=summary_text,
    )

