# Conversational Control Parity

> Generated from the canonical UI inventory, capability manifest, provider registries, and external control ledger. Do not edit counts by hand.

| Measure | Value |
| --- | --- |
| Operations | 233 |
| Mobile | {"ready":129,"excluded":7,"missing_provider":97} |
| Phone | {"ready":120,"excluded":7,"missing_provider":106} |
| External | {"boundary":7,"ready":118,"missing_provider":106,"excluded":2} |
| Voice | {"missing_conformance":226,"excluded":7} |
| Final parity errors | 652 |

## Operations

| Operation | Owner | Mode | Mobile | Phone | External | Voice |
| --- | --- | --- | --- | --- | --- | --- |
| `general.answer` | general | direct | ready | ready | boundary | missing_conformance |
| `general.answer_with_context` | general | direct | ready | ready | boundary | missing_conformance |
| `relationships.read` | relationships | direct | ready | ready | ready | missing_conformance |
| `relationships.remember` | relationships | direct | ready | ready | ready | missing_conformance |
| `relationships.correct` | relationships | direct | ready | ready | ready | missing_conformance |
| `relationships.forget` | relationships | direct | ready | ready | ready | missing_conformance |
| `relationships.forget_person` | relationships | supported_boundary | excluded | excluded | boundary | excluded |
| `household.read` | household | direct | ready | ready | ready | missing_conformance |
| `household.member.add_dependent` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.invitation.create` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.invitation.preview` | household | direct | ready | ready | ready | missing_conformance |
| `household.invitation.accept` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.child_capability.update` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.caregiver_grant.update` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `profile.read` | profile | direct | ready | ready | ready | missing_conformance |
| `profile.update` | profile | reviewed_proposal | ready | ready | ready | missing_conformance |
| `arcs.list` | arcs | direct | ready | ready | ready | missing_conformance |
| `arcs.get` | arcs | direct | ready | ready | ready | missing_conformance |
| `arcs.create` | arcs | reviewed_proposal | ready | ready | ready | missing_conformance |
| `arcs.update` | arcs | reviewed_proposal | ready | ready | ready | missing_conformance |
| `arcs.delete` | arcs | reviewed_proposal | ready | ready | ready | missing_conformance |
| `goals.list` | goals | direct | ready | ready | ready | missing_conformance |
| `goals.get` | goals | direct | ready | ready | ready | missing_conformance |
| `goals.create` | goals | reviewed_proposal | ready | ready | ready | missing_conformance |
| `goals.update` | goals | reviewed_proposal | ready | ready | ready | missing_conformance |
| `goals.delete` | goals | reviewed_proposal | ready | ready | ready | missing_conformance |
| `goals.check_in` | goals | native_handoff | ready | ready | ready | missing_conformance |
| `goals.share` | goals | native_handoff | ready | ready | ready | missing_conformance |
| `activities.list` | todos | direct | ready | ready | ready | missing_conformance |
| `activities.get` | todos | direct | ready | ready | ready | missing_conformance |
| `activities.search` | todos | direct | ready | ready | ready | missing_conformance |
| `activities.capture` | todos | direct | ready | ready | ready | missing_conformance |
| `activities.update` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.complete` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.delete` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.steps.create` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.steps.update` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.steps.complete` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.steps.delete` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.steps.reorder` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.focus.open` | todos | native_handoff | ready | ready | ready | missing_conformance |
| `activities.focus_today` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.schedule` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `plan.schedule_chunks` | plan | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.reminder.update` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.repeat.update` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
| `activities.location.update` | todos | native_handoff | ready | ready | ready | missing_conformance |
| `activities.attachments.update` | todos | native_handoff | ready | ready | ready | missing_conformance |
| `activities.share` | todos | native_handoff | ready | ready | ready | missing_conformance |
| `plan.read_day_context` | plan | direct | ready | ready | ready | missing_conformance |
| `plan.recommend_day` | plan | direct | ready | ready | ready | missing_conformance |
| `plan.schedule_activity` | plan | reviewed_proposal | ready | ready | ready | missing_conformance |
| `plan.reschedule_activity` | plan | reviewed_proposal | ready | ready | ready | missing_conformance |
| `plan.remove_activity` | plan | reviewed_proposal | ready | ready | ready | missing_conformance |
| `plan.preferences.open` | plan | native_handoff | ready | ready | ready | missing_conformance |
| `chapters.list` | chapters | direct | ready | ready | ready | missing_conformance |
| `chapters.get` | chapters | direct | ready | ready | ready | missing_conformance |
| `chapters.reflect` | chapters | direct | ready | ready | ready | missing_conformance |
| `chapters.note.update` | chapters | reviewed_proposal | ready | ready | ready | missing_conformance |
| `account.show_up_status` | account | direct | ready | ready | ready | missing_conformance |
| `money.read` | money | direct | ready | missing_provider | missing_provider | missing_conformance |
| `money.review_transaction` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `money.category.create` | money | reviewed_proposal | ready | missing_provider | missing_provider | missing_conformance |
| `money.category.rename` | money | reviewed_proposal | ready | missing_provider | missing_provider | missing_conformance |
| `money.app_control.review` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `money.category.update` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `money.privacy.configure` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `money.connection.connect` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `money.connection.sync` | money | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `explore.open` | explore | excluded | excluded | excluded | excluded | excluded |
| `games.open` | games | excluded | excluded | excluded | excluded | excluded |
| `chores.open` | chores | native_handoff | ready | ready | ready | missing_conformance |
| `recipes.search` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.read` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.create` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.import.prepare` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.import.approve` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.update` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.scale.preview` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.fork` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.share_copy.prepare` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.collaborator.invite` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.prepare` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.publish` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.attest_rights` | recipes | supported_boundary | excluded | excluded | boundary | excluded |
| `recipes.delete` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.create` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.update` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidate.add` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidate.remove` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.round.open` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.round.close` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.response.submit` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.response.withdraw` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.finalize` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.revise` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidates.prepare` | meal_planning | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_budget.read` | savings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.read` | groceries | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.observe` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.deplete` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.compile` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.add` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.update` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.set_state` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.list.review` | groceries | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.product_match.prepare` | groceries | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.product_match.confirm` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.handoff.prepare` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.handoff.open` | groceries | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.checkout` | groceries | supported_boundary | excluded | excluded | boundary | excluded |
| `groceries.payment` | groceries | supported_boundary | excluded | excluded | boundary | excluded |
| `store_opportunity.capture` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_scenario.prepare` | groceries | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_scenario.accept` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.review` | savings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.accept` | savings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.coupon.apply_unsupported` | savings | supported_boundary | excluded | excluded | boundary | excluded |
| `savings.coupon.open` | savings | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `receipt.extract` | groceries | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `receipt.reconcile` | groceries | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.read` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.start` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.control` | recipes | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.complete` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.read` | screenTime | direct | ready | ready | ready | missing_conformance |
| `screen_time.agreement.create` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.agreement.update` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.agreement.deactivate` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.block` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.allow` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.cancel` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.request.decide` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.personal.setup.open` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `screen_time.personal.limit.open` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `screen_time.selection.open` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `screen_time.device.setup.open` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `screen_time.device.release.open` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `screen_time.configure` | screenTime | native_handoff | ready | ready | ready | missing_conformance |
| `notifications.configure` | notifications | native_handoff | ready | ready | ready | missing_conformance |
| `search.open` | navigation | native_handoff | ready | ready | ready | missing_conformance |
| `account.settings.open` | account | native_handoff | ready | ready | ready | missing_conformance |
| `account.subscription.manage` | account | native_handoff | ready | ready | ready | missing_conformance |
| `account.delete` | account | native_handoff | ready | ready | ready | missing_conformance |
| `channel.phone.continue_run` | channels | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `household.member.update` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.member.remove` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.device.list` | household | direct | ready | ready | ready | missing_conformance |
| `household.device.update` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.device.revoke` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `household.device.reconcile` | household | reviewed_proposal | ready | ready | ready | missing_conformance |
| `plan.availability.read` | plan | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `plan.availability.update` | plan | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `plan.calendars.read` | plan | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `plan.calendars.update` | plan | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `chapters.digest_settings.read` | chapters | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `chapters.digest_settings.update` | chapters | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `chapters.alignment.preview` | chapters | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `chapters.alignment.apply` | chapters | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.appearance.read` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.appearance.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.ai_model.read` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.ai_model.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.phone_agent.read` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.phone_agent.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.connected_tools.list` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.connected_tools.get` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.connected_tools.connect.open` | settings | provider_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.connected_tools.revoke` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.sharing.list` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.sharing.invitation.prepare` | settings | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.sharing.connection.revoke` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.haptics.read` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.haptics.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.widgets.read` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.widgets.configure` | settings | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.execution_targets.list` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.execution_targets.get` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.execution_targets.create` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.execution_targets.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.execution_targets.delete` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.destinations.list` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.destinations.get` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.destinations.create` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.destinations.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.destinations.delete` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.activity_areas.list` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.activity_areas.get` | settings | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.activity_areas.create` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.activity_areas.update` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `settings.activity_areas.delete` | settings | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `money.budget.read` | money | direct | ready | ready | ready | missing_conformance |
| `money.budget.update` | money | reviewed_proposal | ready | ready | ready | missing_conformance |
| `money.transaction.get` | money | direct | ready | ready | ready | missing_conformance |
| `money.transaction.meaning.update` | money | reviewed_proposal | ready | ready | ready | missing_conformance |
| `money.transaction.plan_treatment.update` | money | reviewed_proposal | ready | ready | ready | missing_conformance |
| `money.connection.disconnect` | money | reviewed_proposal | ready | ready | ready | missing_conformance |
| `money.connection.repair.open` | money | provider_handoff | ready | ready | ready | missing_conformance |
| `money.transfer.list` | money | direct | ready | ready | ready | missing_conformance |
| `money.transfer.get` | money | direct | ready | ready | ready | missing_conformance |
| `money.transfer.review` | money | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.list` | chores | direct | ready | ready | ready | missing_conformance |
| `chores.get` | chores | direct | ready | ready | ready | missing_conformance |
| `chores.definition.create` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.definition.update` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.definition.pause` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.definition.delete` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.occurrence.claim` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.occurrence.release` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.occurrence.complete` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.occurrence.reopen` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.occurrence.report_earlier` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.evidence.add` | chores | native_handoff | ready | ready | ready | missing_conformance |
| `chores.review.approve` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.review.return` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.review.leave_missed` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.reward.read` | chores | direct | ready | ready | ready | missing_conformance |
| `chores.reward.configure` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.reward.reserve` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.reward.cancel` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `chores.reward.settle` | chores | reviewed_proposal | ready | ready | ready | missing_conformance |
| `recipes.favorite.update` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.visibility.update` | recipes | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.preferences.read` | meal_planning | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.preferences.update` | meal_planning | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.personal_rule.list` | screenTime | direct | ready | ready | ready | missing_conformance |
| `screen_time.personal_rule.get` | screenTime | direct | ready | ready | ready | missing_conformance |
| `screen_time.personal_rule.update` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.personal_rule.deactivate` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.personal_rule.delete` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `notifications.preferences.read` | notifications | direct | missing_provider | missing_provider | missing_provider | missing_conformance |
| `notifications.preferences.update` | notifications | reviewed_proposal | missing_provider | missing_provider | missing_provider | missing_conformance |
| `navigation.open_capability` | navigation | native_handoff | missing_provider | missing_provider | missing_provider | missing_conformance |

## Final parity errors

- general.answer voice is missing_conformance
- general.answer_with_context voice is missing_conformance
- relationships.read voice is missing_conformance
- relationships.remember voice is missing_conformance
- relationships.correct voice is missing_conformance
- relationships.forget voice is missing_conformance
- relationships.forget_person mobile is excluded
- relationships.forget_person phone is excluded
- relationships.forget_person voice is excluded
- relationships.forget_person has no proof paths
- household.read voice is missing_conformance
- household.member.add_dependent voice is missing_conformance
- household.invitation.create voice is missing_conformance
- household.invitation.preview voice is missing_conformance
- household.invitation.accept voice is missing_conformance
- household.child_capability.update voice is missing_conformance
- household.caregiver_grant.update voice is missing_conformance
- profile.read voice is missing_conformance
- profile.update voice is missing_conformance
- arcs.list voice is missing_conformance
- arcs.get voice is missing_conformance
- arcs.create voice is missing_conformance
- arcs.update voice is missing_conformance
- arcs.delete voice is missing_conformance
- goals.list voice is missing_conformance
- goals.get voice is missing_conformance
- goals.create voice is missing_conformance
- goals.update voice is missing_conformance
- goals.delete voice is missing_conformance
- goals.check_in voice is missing_conformance
- goals.share voice is missing_conformance
- activities.list voice is missing_conformance
- activities.get voice is missing_conformance
- activities.search voice is missing_conformance
- activities.capture voice is missing_conformance
- activities.update voice is missing_conformance
- activities.complete voice is missing_conformance
- activities.delete voice is missing_conformance
- activities.steps.create voice is missing_conformance
- activities.steps.update voice is missing_conformance
- activities.steps.complete voice is missing_conformance
- activities.steps.delete voice is missing_conformance
- activities.steps.reorder voice is missing_conformance
- activities.focus.open voice is missing_conformance
- activities.focus_today voice is missing_conformance
- activities.schedule voice is missing_conformance
- plan.schedule_chunks voice is missing_conformance
- activities.reminder.update voice is missing_conformance
- activities.repeat.update voice is missing_conformance
- activities.location.update voice is missing_conformance
- activities.attachments.update voice is missing_conformance
- activities.share voice is missing_conformance
- plan.read_day_context voice is missing_conformance
- plan.recommend_day voice is missing_conformance
- plan.schedule_activity voice is missing_conformance
- plan.reschedule_activity voice is missing_conformance
- plan.remove_activity voice is missing_conformance
- plan.preferences.open voice is missing_conformance
- chapters.list voice is missing_conformance
- chapters.get voice is missing_conformance
- chapters.reflect voice is missing_conformance
- chapters.note.update voice is missing_conformance
- account.show_up_status voice is missing_conformance
- money.read phone is missing_provider
- money.read external is missing_provider
- money.read voice is missing_conformance
- money.review_transaction phone is missing_provider
- money.review_transaction external is missing_provider
- money.review_transaction voice is missing_conformance
- money.category.create phone is missing_provider
- money.category.create external is missing_provider
- money.category.create voice is missing_conformance
- money.category.rename phone is missing_provider
- money.category.rename external is missing_provider
- money.category.rename voice is missing_conformance
- money.app_control.review phone is missing_provider
- money.app_control.review external is missing_provider
- money.app_control.review voice is missing_conformance
- money.category.update phone is missing_provider
- money.category.update external is missing_provider
- money.category.update voice is missing_conformance
- money.privacy.configure phone is missing_provider
- money.privacy.configure external is missing_provider
- money.privacy.configure voice is missing_conformance
- money.connection.connect phone is missing_provider
- money.connection.connect external is missing_provider
- money.connection.connect voice is missing_conformance
- money.connection.sync phone is missing_provider
- money.connection.sync external is missing_provider
- money.connection.sync voice is missing_conformance
- chores.open voice is missing_conformance
- recipes.search mobile is missing_provider
- recipes.search phone is missing_provider
- recipes.search external is missing_provider
- recipes.search voice is missing_conformance
- recipes.search has no proof paths
- recipes.read mobile is missing_provider
- recipes.read phone is missing_provider
- recipes.read external is missing_provider
- recipes.read voice is missing_conformance
- recipes.read has no proof paths
- recipes.create mobile is missing_provider
- recipes.create phone is missing_provider
- recipes.create external is missing_provider
- recipes.create voice is missing_conformance
- recipes.create has no proof paths
- recipes.import.prepare mobile is missing_provider
- recipes.import.prepare phone is missing_provider
- recipes.import.prepare external is missing_provider
- recipes.import.prepare voice is missing_conformance
- recipes.import.prepare has no proof paths
- recipes.import.approve mobile is missing_provider
- recipes.import.approve phone is missing_provider
- recipes.import.approve external is missing_provider
- recipes.import.approve voice is missing_conformance
- recipes.import.approve has no proof paths
- recipes.update mobile is missing_provider
- recipes.update phone is missing_provider
- recipes.update external is missing_provider
- recipes.update voice is missing_conformance
- recipes.update has no proof paths
- recipes.scale.preview mobile is missing_provider
- recipes.scale.preview phone is missing_provider
- recipes.scale.preview external is missing_provider
- recipes.scale.preview voice is missing_conformance
- recipes.scale.preview has no proof paths
- recipes.fork mobile is missing_provider
- recipes.fork phone is missing_provider
- recipes.fork external is missing_provider
- recipes.fork voice is missing_conformance
- recipes.fork has no proof paths
- recipes.share_copy.prepare mobile is missing_provider
- recipes.share_copy.prepare phone is missing_provider
- recipes.share_copy.prepare external is missing_provider
- recipes.share_copy.prepare voice is missing_conformance
- recipes.share_copy.prepare has no proof paths
- recipes.collaborator.invite mobile is missing_provider
- recipes.collaborator.invite phone is missing_provider
- recipes.collaborator.invite external is missing_provider
- recipes.collaborator.invite voice is missing_conformance
- recipes.collaborator.invite has no proof paths
- recipes.publication.prepare mobile is missing_provider
- recipes.publication.prepare phone is missing_provider
- recipes.publication.prepare external is missing_provider
- recipes.publication.prepare voice is missing_conformance
- recipes.publication.prepare has no proof paths
- recipes.publication.publish mobile is missing_provider
- recipes.publication.publish phone is missing_provider
- recipes.publication.publish external is missing_provider
- recipes.publication.publish voice is missing_conformance
- recipes.publication.publish has no proof paths
- recipes.publication.attest_rights mobile is excluded
- recipes.publication.attest_rights phone is excluded
- recipes.publication.attest_rights voice is excluded
- recipes.publication.attest_rights has no proof paths
- recipes.delete mobile is missing_provider
- recipes.delete phone is missing_provider
- recipes.delete external is missing_provider
- recipes.delete voice is missing_conformance
- recipes.delete has no proof paths
- meal_planning.plan.create mobile is missing_provider
- meal_planning.plan.create phone is missing_provider
- meal_planning.plan.create external is missing_provider
- meal_planning.plan.create voice is missing_conformance
- meal_planning.plan.create has no proof paths
- meal_planning.plan.update mobile is missing_provider
- meal_planning.plan.update phone is missing_provider
- meal_planning.plan.update external is missing_provider
- meal_planning.plan.update voice is missing_conformance
- meal_planning.plan.update has no proof paths
- meal_planning.candidate.add mobile is missing_provider
- meal_planning.candidate.add phone is missing_provider
- meal_planning.candidate.add external is missing_provider
- meal_planning.candidate.add voice is missing_conformance
- meal_planning.candidate.add has no proof paths
- meal_planning.candidate.remove mobile is missing_provider
- meal_planning.candidate.remove phone is missing_provider
- meal_planning.candidate.remove external is missing_provider
- meal_planning.candidate.remove voice is missing_conformance
- meal_planning.candidate.remove has no proof paths
- meal_planning.round.open mobile is missing_provider
- meal_planning.round.open phone is missing_provider
- meal_planning.round.open external is missing_provider
- meal_planning.round.open voice is missing_conformance
- meal_planning.round.open has no proof paths
- meal_planning.round.close mobile is missing_provider
- meal_planning.round.close phone is missing_provider
- meal_planning.round.close external is missing_provider
- meal_planning.round.close voice is missing_conformance
- meal_planning.round.close has no proof paths
- meal_planning.response.submit mobile is missing_provider
- meal_planning.response.submit phone is missing_provider
- meal_planning.response.submit external is missing_provider
- meal_planning.response.submit voice is missing_conformance
- meal_planning.response.submit has no proof paths
- meal_planning.response.withdraw mobile is missing_provider
- meal_planning.response.withdraw phone is missing_provider
- meal_planning.response.withdraw external is missing_provider
- meal_planning.response.withdraw voice is missing_conformance
- meal_planning.response.withdraw has no proof paths
- meal_planning.plan.finalize mobile is missing_provider
- meal_planning.plan.finalize phone is missing_provider
- meal_planning.plan.finalize external is missing_provider
- meal_planning.plan.finalize voice is missing_conformance
- meal_planning.plan.finalize has no proof paths
- meal_planning.plan.revise mobile is missing_provider
- meal_planning.plan.revise phone is missing_provider
- meal_planning.plan.revise external is missing_provider
- meal_planning.plan.revise voice is missing_conformance
- meal_planning.plan.revise has no proof paths
- meal_planning.candidates.prepare mobile is missing_provider
- meal_planning.candidates.prepare phone is missing_provider
- meal_planning.candidates.prepare external is missing_provider
- meal_planning.candidates.prepare voice is missing_conformance
- meal_planning.candidates.prepare has no proof paths
- food_budget.read mobile is missing_provider
- food_budget.read phone is missing_provider
- food_budget.read external is missing_provider
- food_budget.read voice is missing_conformance
- food_budget.read has no proof paths
- food_stock.read mobile is missing_provider
- food_stock.read phone is missing_provider
- food_stock.read external is missing_provider
- food_stock.read voice is missing_conformance
- food_stock.read has no proof paths
- food_stock.observe mobile is missing_provider
- food_stock.observe phone is missing_provider
- food_stock.observe external is missing_provider
- food_stock.observe voice is missing_conformance
- food_stock.observe has no proof paths
- food_stock.deplete mobile is missing_provider
- food_stock.deplete phone is missing_provider
- food_stock.deplete external is missing_provider
- food_stock.deplete voice is missing_conformance
- food_stock.deplete has no proof paths
- groceries.compile mobile is missing_provider
- groceries.compile phone is missing_provider
- groceries.compile external is missing_provider
- groceries.compile voice is missing_conformance
- groceries.compile has no proof paths
- groceries.item.add mobile is missing_provider
- groceries.item.add phone is missing_provider
- groceries.item.add external is missing_provider
- groceries.item.add voice is missing_conformance
- groceries.item.add has no proof paths
- groceries.item.update mobile is missing_provider
- groceries.item.update phone is missing_provider
- groceries.item.update external is missing_provider
- groceries.item.update voice is missing_conformance
- groceries.item.update has no proof paths
- groceries.item.set_state mobile is missing_provider
- groceries.item.set_state phone is missing_provider
- groceries.item.set_state external is missing_provider
- groceries.item.set_state voice is missing_conformance
- groceries.item.set_state has no proof paths
- groceries.list.review mobile is missing_provider
- groceries.list.review phone is missing_provider
- groceries.list.review external is missing_provider
- groceries.list.review voice is missing_conformance
- groceries.list.review has no proof paths
- groceries.product_match.prepare mobile is missing_provider
- groceries.product_match.prepare phone is missing_provider
- groceries.product_match.prepare external is missing_provider
- groceries.product_match.prepare voice is missing_conformance
- groceries.product_match.prepare has no proof paths
- groceries.product_match.confirm mobile is missing_provider
- groceries.product_match.confirm phone is missing_provider
- groceries.product_match.confirm external is missing_provider
- groceries.product_match.confirm voice is missing_conformance
- groceries.product_match.confirm has no proof paths
- groceries.handoff.prepare mobile is missing_provider
- groceries.handoff.prepare phone is missing_provider
- groceries.handoff.prepare external is missing_provider
- groceries.handoff.prepare voice is missing_conformance
- groceries.handoff.prepare has no proof paths
- groceries.handoff.open mobile is missing_provider
- groceries.handoff.open phone is missing_provider
- groceries.handoff.open external is missing_provider
- groceries.handoff.open voice is missing_conformance
- groceries.handoff.open has no proof paths
- groceries.checkout mobile is excluded
- groceries.checkout phone is excluded
- groceries.checkout voice is excluded
- groceries.checkout has no proof paths
- groceries.payment mobile is excluded
- groceries.payment phone is excluded
- groceries.payment voice is excluded
- groceries.payment has no proof paths
- store_opportunity.capture mobile is missing_provider
- store_opportunity.capture phone is missing_provider
- store_opportunity.capture external is missing_provider
- store_opportunity.capture voice is missing_conformance
- store_opportunity.capture has no proof paths
- food_scenario.prepare mobile is missing_provider
- food_scenario.prepare phone is missing_provider
- food_scenario.prepare external is missing_provider
- food_scenario.prepare voice is missing_conformance
- food_scenario.prepare has no proof paths
- food_scenario.accept mobile is missing_provider
- food_scenario.accept phone is missing_provider
- food_scenario.accept external is missing_provider
- food_scenario.accept voice is missing_conformance
- food_scenario.accept has no proof paths
- savings.review mobile is missing_provider
- savings.review phone is missing_provider
- savings.review external is missing_provider
- savings.review voice is missing_conformance
- savings.review has no proof paths
- savings.accept mobile is missing_provider
- savings.accept phone is missing_provider
- savings.accept external is missing_provider
- savings.accept voice is missing_conformance
- savings.accept has no proof paths
- savings.coupon.apply_unsupported mobile is excluded
- savings.coupon.apply_unsupported phone is excluded
- savings.coupon.apply_unsupported voice is excluded
- savings.coupon.apply_unsupported has no proof paths
- savings.coupon.open mobile is missing_provider
- savings.coupon.open phone is missing_provider
- savings.coupon.open external is missing_provider
- savings.coupon.open voice is missing_conformance
- savings.coupon.open has no proof paths
- receipt.extract mobile is missing_provider
- receipt.extract phone is missing_provider
- receipt.extract external is missing_provider
- receipt.extract voice is missing_conformance
- receipt.extract has no proof paths
- receipt.reconcile mobile is missing_provider
- receipt.reconcile phone is missing_provider
- receipt.reconcile external is missing_provider
- receipt.reconcile voice is missing_conformance
- receipt.reconcile has no proof paths
- cook_session.read mobile is missing_provider
- cook_session.read phone is missing_provider
- cook_session.read external is missing_provider
- cook_session.read voice is missing_conformance
- cook_session.read has no proof paths
- cook_session.start mobile is missing_provider
- cook_session.start phone is missing_provider
- cook_session.start external is missing_provider
- cook_session.start voice is missing_conformance
- cook_session.start has no proof paths
- cook_session.control mobile is missing_provider
- cook_session.control phone is missing_provider
- cook_session.control external is missing_provider
- cook_session.control voice is missing_conformance
- cook_session.control has no proof paths
- cook_session.complete mobile is missing_provider
- cook_session.complete phone is missing_provider
- cook_session.complete external is missing_provider
- cook_session.complete voice is missing_conformance
- cook_session.complete has no proof paths
- screen_time.read voice is missing_conformance
- screen_time.agreement.create voice is missing_conformance
- screen_time.agreement.update voice is missing_conformance
- screen_time.agreement.deactivate voice is missing_conformance
- screen_time.override.block voice is missing_conformance
- screen_time.override.allow voice is missing_conformance
- screen_time.override.cancel voice is missing_conformance
- screen_time.request.decide voice is missing_conformance
- screen_time.personal.setup.open voice is missing_conformance
- screen_time.personal.limit.open voice is missing_conformance
- screen_time.selection.open voice is missing_conformance
- screen_time.device.setup.open voice is missing_conformance
- screen_time.device.release.open voice is missing_conformance
- screen_time.configure voice is missing_conformance
- notifications.configure voice is missing_conformance
- search.open voice is missing_conformance
- account.settings.open voice is missing_conformance
- account.subscription.manage voice is missing_conformance
- account.delete voice is missing_conformance
- channel.phone.continue_run mobile is missing_provider
- channel.phone.continue_run phone is missing_provider
- channel.phone.continue_run external is missing_provider
- channel.phone.continue_run voice is missing_conformance
- channel.phone.continue_run has no proof paths
- household.member.update voice is missing_conformance
- household.member.remove voice is missing_conformance
- household.device.list voice is missing_conformance
- household.device.update voice is missing_conformance
- household.device.revoke voice is missing_conformance
- household.device.reconcile voice is missing_conformance
- plan.availability.read mobile is missing_provider
- plan.availability.read phone is missing_provider
- plan.availability.read external is missing_provider
- plan.availability.read voice is missing_conformance
- plan.availability.read has no proof paths
- plan.availability.update mobile is missing_provider
- plan.availability.update phone is missing_provider
- plan.availability.update external is missing_provider
- plan.availability.update voice is missing_conformance
- plan.availability.update has no proof paths
- plan.calendars.read mobile is missing_provider
- plan.calendars.read phone is missing_provider
- plan.calendars.read external is missing_provider
- plan.calendars.read voice is missing_conformance
- plan.calendars.read has no proof paths
- plan.calendars.update mobile is missing_provider
- plan.calendars.update phone is missing_provider
- plan.calendars.update external is missing_provider
- plan.calendars.update voice is missing_conformance
- plan.calendars.update has no proof paths
- chapters.digest_settings.read mobile is missing_provider
- chapters.digest_settings.read phone is missing_provider
- chapters.digest_settings.read external is missing_provider
- chapters.digest_settings.read voice is missing_conformance
- chapters.digest_settings.read has no proof paths
- chapters.digest_settings.update mobile is missing_provider
- chapters.digest_settings.update phone is missing_provider
- chapters.digest_settings.update external is missing_provider
- chapters.digest_settings.update voice is missing_conformance
- chapters.digest_settings.update has no proof paths
- chapters.alignment.preview mobile is missing_provider
- chapters.alignment.preview phone is missing_provider
- chapters.alignment.preview external is missing_provider
- chapters.alignment.preview voice is missing_conformance
- chapters.alignment.preview has no proof paths
- chapters.alignment.apply mobile is missing_provider
- chapters.alignment.apply phone is missing_provider
- chapters.alignment.apply external is missing_provider
- chapters.alignment.apply voice is missing_conformance
- chapters.alignment.apply has no proof paths
- settings.appearance.read mobile is missing_provider
- settings.appearance.read phone is missing_provider
- settings.appearance.read external is missing_provider
- settings.appearance.read voice is missing_conformance
- settings.appearance.read has no proof paths
- settings.appearance.update mobile is missing_provider
- settings.appearance.update phone is missing_provider
- settings.appearance.update external is missing_provider
- settings.appearance.update voice is missing_conformance
- settings.appearance.update has no proof paths
- settings.ai_model.read mobile is missing_provider
- settings.ai_model.read phone is missing_provider
- settings.ai_model.read external is missing_provider
- settings.ai_model.read voice is missing_conformance
- settings.ai_model.read has no proof paths
- settings.ai_model.update mobile is missing_provider
- settings.ai_model.update phone is missing_provider
- settings.ai_model.update external is missing_provider
- settings.ai_model.update voice is missing_conformance
- settings.ai_model.update has no proof paths
- settings.phone_agent.read mobile is missing_provider
- settings.phone_agent.read phone is missing_provider
- settings.phone_agent.read external is missing_provider
- settings.phone_agent.read voice is missing_conformance
- settings.phone_agent.read has no proof paths
- settings.phone_agent.update mobile is missing_provider
- settings.phone_agent.update phone is missing_provider
- settings.phone_agent.update external is missing_provider
- settings.phone_agent.update voice is missing_conformance
- settings.phone_agent.update has no proof paths
- settings.connected_tools.list mobile is missing_provider
- settings.connected_tools.list phone is missing_provider
- settings.connected_tools.list external is missing_provider
- settings.connected_tools.list voice is missing_conformance
- settings.connected_tools.list has no proof paths
- settings.connected_tools.get mobile is missing_provider
- settings.connected_tools.get phone is missing_provider
- settings.connected_tools.get external is missing_provider
- settings.connected_tools.get voice is missing_conformance
- settings.connected_tools.get has no proof paths
- settings.connected_tools.connect.open mobile is missing_provider
- settings.connected_tools.connect.open phone is missing_provider
- settings.connected_tools.connect.open external is missing_provider
- settings.connected_tools.connect.open voice is missing_conformance
- settings.connected_tools.connect.open has no proof paths
- settings.connected_tools.revoke mobile is missing_provider
- settings.connected_tools.revoke phone is missing_provider
- settings.connected_tools.revoke external is missing_provider
- settings.connected_tools.revoke voice is missing_conformance
- settings.connected_tools.revoke has no proof paths
- settings.sharing.list mobile is missing_provider
- settings.sharing.list phone is missing_provider
- settings.sharing.list external is missing_provider
- settings.sharing.list voice is missing_conformance
- settings.sharing.list has no proof paths
- settings.sharing.invitation.prepare mobile is missing_provider
- settings.sharing.invitation.prepare phone is missing_provider
- settings.sharing.invitation.prepare external is missing_provider
- settings.sharing.invitation.prepare voice is missing_conformance
- settings.sharing.invitation.prepare has no proof paths
- settings.sharing.connection.revoke mobile is missing_provider
- settings.sharing.connection.revoke phone is missing_provider
- settings.sharing.connection.revoke external is missing_provider
- settings.sharing.connection.revoke voice is missing_conformance
- settings.sharing.connection.revoke has no proof paths
- settings.haptics.read mobile is missing_provider
- settings.haptics.read phone is missing_provider
- settings.haptics.read external is missing_provider
- settings.haptics.read voice is missing_conformance
- settings.haptics.read has no proof paths
- settings.haptics.update mobile is missing_provider
- settings.haptics.update phone is missing_provider
- settings.haptics.update external is missing_provider
- settings.haptics.update voice is missing_conformance
- settings.haptics.update has no proof paths
- settings.widgets.read mobile is missing_provider
- settings.widgets.read phone is missing_provider
- settings.widgets.read external is missing_provider
- settings.widgets.read voice is missing_conformance
- settings.widgets.read has no proof paths
- settings.widgets.configure mobile is missing_provider
- settings.widgets.configure phone is missing_provider
- settings.widgets.configure external is missing_provider
- settings.widgets.configure voice is missing_conformance
- settings.widgets.configure has no proof paths
- settings.execution_targets.list mobile is missing_provider
- settings.execution_targets.list phone is missing_provider
- settings.execution_targets.list external is missing_provider
- settings.execution_targets.list voice is missing_conformance
- settings.execution_targets.list has no proof paths
- settings.execution_targets.get mobile is missing_provider
- settings.execution_targets.get phone is missing_provider
- settings.execution_targets.get external is missing_provider
- settings.execution_targets.get voice is missing_conformance
- settings.execution_targets.get has no proof paths
- settings.execution_targets.create mobile is missing_provider
- settings.execution_targets.create phone is missing_provider
- settings.execution_targets.create external is missing_provider
- settings.execution_targets.create voice is missing_conformance
- settings.execution_targets.create has no proof paths
- settings.execution_targets.update mobile is missing_provider
- settings.execution_targets.update phone is missing_provider
- settings.execution_targets.update external is missing_provider
- settings.execution_targets.update voice is missing_conformance
- settings.execution_targets.update has no proof paths
- settings.execution_targets.delete mobile is missing_provider
- settings.execution_targets.delete phone is missing_provider
- settings.execution_targets.delete external is missing_provider
- settings.execution_targets.delete voice is missing_conformance
- settings.execution_targets.delete has no proof paths
- settings.destinations.list mobile is missing_provider
- settings.destinations.list phone is missing_provider
- settings.destinations.list external is missing_provider
- settings.destinations.list voice is missing_conformance
- settings.destinations.list has no proof paths
- settings.destinations.get mobile is missing_provider
- settings.destinations.get phone is missing_provider
- settings.destinations.get external is missing_provider
- settings.destinations.get voice is missing_conformance
- settings.destinations.get has no proof paths
- settings.destinations.create mobile is missing_provider
- settings.destinations.create phone is missing_provider
- settings.destinations.create external is missing_provider
- settings.destinations.create voice is missing_conformance
- settings.destinations.create has no proof paths
- settings.destinations.update mobile is missing_provider
- settings.destinations.update phone is missing_provider
- settings.destinations.update external is missing_provider
- settings.destinations.update voice is missing_conformance
- settings.destinations.update has no proof paths
- settings.destinations.delete mobile is missing_provider
- settings.destinations.delete phone is missing_provider
- settings.destinations.delete external is missing_provider
- settings.destinations.delete voice is missing_conformance
- settings.destinations.delete has no proof paths
- settings.activity_areas.list mobile is missing_provider
- settings.activity_areas.list phone is missing_provider
- settings.activity_areas.list external is missing_provider
- settings.activity_areas.list voice is missing_conformance
- settings.activity_areas.list has no proof paths
- settings.activity_areas.get mobile is missing_provider
- settings.activity_areas.get phone is missing_provider
- settings.activity_areas.get external is missing_provider
- settings.activity_areas.get voice is missing_conformance
- settings.activity_areas.get has no proof paths
- settings.activity_areas.create mobile is missing_provider
- settings.activity_areas.create phone is missing_provider
- settings.activity_areas.create external is missing_provider
- settings.activity_areas.create voice is missing_conformance
- settings.activity_areas.create has no proof paths
- settings.activity_areas.update mobile is missing_provider
- settings.activity_areas.update phone is missing_provider
- settings.activity_areas.update external is missing_provider
- settings.activity_areas.update voice is missing_conformance
- settings.activity_areas.update has no proof paths
- settings.activity_areas.delete mobile is missing_provider
- settings.activity_areas.delete phone is missing_provider
- settings.activity_areas.delete external is missing_provider
- settings.activity_areas.delete voice is missing_conformance
- settings.activity_areas.delete has no proof paths
- money.budget.read voice is missing_conformance
- money.budget.update voice is missing_conformance
- money.transaction.get voice is missing_conformance
- money.transaction.meaning.update voice is missing_conformance
- money.transaction.plan_treatment.update voice is missing_conformance
- money.connection.disconnect voice is missing_conformance
- money.connection.repair.open voice is missing_conformance
- money.transfer.list voice is missing_conformance
- money.transfer.get voice is missing_conformance
- money.transfer.review voice is missing_conformance
- chores.list voice is missing_conformance
- chores.get voice is missing_conformance
- chores.definition.create voice is missing_conformance
- chores.definition.update voice is missing_conformance
- chores.definition.pause voice is missing_conformance
- chores.definition.delete voice is missing_conformance
- chores.occurrence.claim voice is missing_conformance
- chores.occurrence.release voice is missing_conformance
- chores.occurrence.complete voice is missing_conformance
- chores.occurrence.reopen voice is missing_conformance
- chores.occurrence.report_earlier voice is missing_conformance
- chores.evidence.add voice is missing_conformance
- chores.review.approve voice is missing_conformance
- chores.review.return voice is missing_conformance
- chores.review.leave_missed voice is missing_conformance
- chores.reward.read voice is missing_conformance
- chores.reward.configure voice is missing_conformance
- chores.reward.reserve voice is missing_conformance
- chores.reward.cancel voice is missing_conformance
- chores.reward.settle voice is missing_conformance
- recipes.favorite.update mobile is missing_provider
- recipes.favorite.update phone is missing_provider
- recipes.favorite.update external is missing_provider
- recipes.favorite.update voice is missing_conformance
- recipes.favorite.update has no proof paths
- recipes.visibility.update mobile is missing_provider
- recipes.visibility.update phone is missing_provider
- recipes.visibility.update external is missing_provider
- recipes.visibility.update voice is missing_conformance
- recipes.visibility.update has no proof paths
- meal_planning.preferences.read mobile is missing_provider
- meal_planning.preferences.read phone is missing_provider
- meal_planning.preferences.read external is missing_provider
- meal_planning.preferences.read voice is missing_conformance
- meal_planning.preferences.read has no proof paths
- meal_planning.preferences.update mobile is missing_provider
- meal_planning.preferences.update phone is missing_provider
- meal_planning.preferences.update external is missing_provider
- meal_planning.preferences.update voice is missing_conformance
- meal_planning.preferences.update has no proof paths
- screen_time.personal_rule.list voice is missing_conformance
- screen_time.personal_rule.get voice is missing_conformance
- screen_time.personal_rule.update voice is missing_conformance
- screen_time.personal_rule.deactivate voice is missing_conformance
- screen_time.personal_rule.delete voice is missing_conformance
- notifications.preferences.read mobile is missing_provider
- notifications.preferences.read phone is missing_provider
- notifications.preferences.read external is missing_provider
- notifications.preferences.read voice is missing_conformance
- notifications.preferences.read has no proof paths
- notifications.preferences.update mobile is missing_provider
- notifications.preferences.update phone is missing_provider
- notifications.preferences.update external is missing_provider
- notifications.preferences.update voice is missing_conformance
- notifications.preferences.update has no proof paths
- navigation.open_capability mobile is missing_provider
- navigation.open_capability phone is missing_provider
- navigation.open_capability external is missing_provider
- navigation.open_capability voice is missing_conformance
- navigation.open_capability has no proof paths
