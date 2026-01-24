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

#### Zone A - Place (Modes of Work)
- **Purpose**: Persistent navigation between stable locations in the app.
- **Contents**: Primary modes only (e.g. Home, Plan, Arcs, People, Profile).
- **Behavior**: Selecting a Place changes the working context without invoking actions.
- **State**: Exactly one Place is active at all times. The active state must be visually persistent.
- **Persistence**: This zone never disappears entirely while a user is in a Place.

#### Zone B - Action (Intervention)
- **Purpose**: Contextual actions that operate on the current Place or selection.
- **Contents**: One or more action affordances (primary action, quick add, contextual tool).
- **Behavior**: Actions never change the Place. They trigger overlays, creation flows, or tools.
- **State**: Actions do not have "selected" state; they are transient triggers.
- **Scope**: Actions must be defined by the current Place and/or current selection.

#### Spatial Rules (Non-negotiable)
- The two zones must be visually distinct and separated.
- They must not share the same icon style or selection affordance.
- Place indicators must not be used for actions; action buttons must not appear as navigation.
- The bottom bar must communicate the current Place even when actions are unavailable.

#### Content Rules
- Do not add secondary navigation, filters, or settings into the bottom bar.
- If a feature is a Place, it belongs in Zone A.
- If a feature is an Action, it belongs in Zone B and must not replace Place tabs.

---

### 2.2 Bottom Bar Interaction Rules

#### Tap
- **Place**: Tap switches the working context to the selected Place.
- **Action**: Tap triggers the action in the current Place context.

#### Reselect
- **Place**: Reselecting the active Place returns to the root of that Place.
- **Action**: Repeated taps repeat the action, not navigation.

#### Long-Press
- **Place**: Optional long-press opens Place-specific shortcuts or quick switcher.
- **Action**: Long-press opens action variants or reveals advanced options.
- If long-press is not supported, it must do nothing (no hidden navigation).

---

### 2.3 Motion, Scroll, and Layering Behavior

#### Scroll
- The bottom bar may fade or compress while scrolling content in the app canvas.
- It must remain discoverable and reappear on scroll end or upward scroll.
- The Place indicators must remain readable during any scroll behavior.

#### Layering
- The bottom bar is part of the app shell and stays above the app canvas.
- Overlays (modals, sheets) may cover the bar only if they are action-driven.
- Place changes must not occur while an action overlay is in focus.

---

### 2.4 Examples (Concrete)

#### Examples
- **Plan (Place)**: Tapping Plan switches to the Plan workspace. It does not open a tool.
- **Quick Add (Action)**: Tapping Quick Add opens an overlay for creation; it does not navigate.
- **Relaunch action**: Re-tapping Quick Add reopens the overlay in the same Place.

#### Non-examples
- A settings icon inside Zone A that opens a sheet (this is an Action).
- A tab that opens a modal instead of switching Place (this is an Action).

