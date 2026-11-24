# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS in single files (public/index.html, public/admin.html), no new dependencies, no paid services. Node server for local use; Vercel + Upstash Redis for hosting.

## Users

Mixed family/friends group (~11 people, varied ages), opening a link on their phone. Job: enter name and a 4-digit PIN, say what gift they want, later see who they must give a gift to. Second user: the organizer (one person) who loads names, runs the draw, shares the link and resets PINs from /admin.

## Product Purpose

Organize a secret-santa gift exchange with no cost and no setup for participants. Success: everyone gets in on the first try, nobody sees another person's assignment.

## Positioning

A minimal, free, private secret santa for one group: no accounts, no email, only name + PIN.

## Operating Context

Link shared by WhatsApp. Participants open it on phones, mostly once to write a wish and once after the draw.

## Capabilities and Constraints

- Name + 4-digit PIN (created on first entry); wish text up to 500 chars; after the draw, shows the assigned person and their wish.
- Admin: key-protected, names list, draw, reset, copy link and WhatsApp message, reset a person's PIN.
- All IDs and JS handlers in the current pages must keep working.
- Spanish only.

## Brand Commitments

Name "Santa Secreto" and the 🎅 emoji are binding. Current Spanish copy is preserved unless a small change helps clarity (the user also said everything else is free to change).

## Evidence on Hand

No logos, photos or testimonials exist. Do not invent any.

## Product Principles

1. Zero friction: a grandparent and a teenager both get in without help.
2. Privacy by default: the assignment is only ever shown after the PIN.
3. Simple and free: no dependencies, no accounts.
4. Warm, not noisy: festive without hurting readability.

## Accessibility & Inclusion

Mixed ages: large readable text, strong contrast, big touch targets, numeric keyboard for the PIN.
