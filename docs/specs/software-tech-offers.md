# Software/Tech Offer Taxonomy

This spec defines the software/tech specialization layer for the KPI calculator.

## Goals

- Move from generic business labels to software-native monetization models.
- Keep one offer as the unit of analysis.
- Support a staged rollout without breaking current subscription calculations.

## Offer Types

Currently executable:

- `software_subscription`
- `software_paid_pilot`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

Defined for staged implementation:

- `software_pilot_to_subscription`
- `software_token_plus_platform`
- `software_implementation_plus_subscription`
- `software_transaction_fee`
- `software_hybrid_platform_usage`

## Monetization Models

- `subscription_seat_based`
- `subscription_usage_based`
- `subscription_hybrid`
- `paid_pilot`
- `pilot_to_subscription`
- `token_pricing`
- `token_plus_platform_fee`
- `implementation_plus_subscription`
- `transaction_fee`

## Shared Software Revenue Components

- `platform_subscription`
- `seat_subscription`
- `usage_metered`
- `token_usage`
- `pilot_fee`
- `implementation_fee`
- `transaction_fee`

## Current Implementation Rule

- `software_subscription` reuses the existing subscription KPI engine.
- `software_paid_pilot` uses the shared software monetization engine in throughput mode.
- `software_token_pricing` uses the shared software monetization engine in recurring mode, with retention and token-unit economics mapped into the existing KPI envelope.
- `software_hybrid_platform_usage` uses the shared software monetization engine in recurring mode, with blended platform-fee and usage-fee economics mapped into the existing KPI envelope.
- `software_implementation_plus_subscription` uses the shared software monetization engine in mixed mode, with recurring subscription economics plus one-time implementation economics mapped into the existing KPI envelope.
- Executable software offers require `softwareConfig` metadata so the calculator knows which software monetization model the offer represents.
- The remaining software/tech offer types are intentionally defined in schema/types but rejected as "not implemented yet" until their dedicated math paths exist.

## Why This Layer Exists

The upcoming UI should ask users questions in software-native language:

- seats
- accounts / organizations
- pilot fee
- implementation fee
- usage volume
- token pricing
- token cost
- conversion from pilot to recurring

That UI should be driven by this taxonomy rather than by generic business-model labels.
