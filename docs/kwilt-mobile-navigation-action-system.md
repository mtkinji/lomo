# Kwilt Mobile Navigation & Action System
## Engineering Handoff - System Context & UX Architecture

---

## 0. Purpose of This Document

This document defines the **intent, structure, and concrete interaction rules** for Kwilt's mobile navigation and action system.

It is not a design exploration.  
It is a **system contract**.

Engineering should be able to implement this without needing additional interpretation about:
- what navigation exists
- what actions do
- how layers interact
- how scrolling, fading, and animation behave

If something is not specified here, default to **consistency with the rules below**, not invention.

---

## 1. Core System Intent (Non-Negotiable)

> **Kwilt separates _where the user is working_ from _what the user can do next_.**

This separation governs:
- navigation structure
- action placement
- animation
- layering
- input behavior

### Two orthogonal axes
- **Place (Modes of Work)** -> stable, persistent
- **Action (Intervention)** -> dynamic, contextual

These axes must never compete for the same UI affordance.

---

## 2. Navigation Architecture Overview

### 2.1 Bottom Bar Structure

The bottom bar is intentionally split into **two zones**:

