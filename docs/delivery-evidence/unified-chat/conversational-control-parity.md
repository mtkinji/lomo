# Conversational Control Parity

> Generated from the canonical UI inventory, capability manifest, provider registries, and external control ledger. Do not edit counts by hand.

| Measure | Value |
| --- | --- |
| Operations | 145 |
| Mobile | {"ready":77,"excluded":7,"missing_provider":61} |
| Phone | {"ready":67,"excluded":7,"missing_provider":71} |
| External | {"boundary":7,"ready":65,"missing_provider":70,"excluded":2,"missing_proof":1} |
| Voice | {"missing_conformance":138,"excluded":7} |
| Final parity errors | 454 |

## Operations

| Operation | Owner | Mode | Mobile | Phone | External | Voice |
| --- | --- | --- | --- | --- | --- | --- |
| `general.answer` | general | direct | ready | ready | boundary | missing_conformance |
| `general.answer_with_context` | general | direct | ready | ready | boundary | missing_conformance |
| `relationships.read` | relationships | direct | ready | ready | ready | missing_conformance |
| `relationships.remember` | relationships | reviewed_proposal | ready | ready | ready | missing_conformance |
| `relationships.correct` | relationships | reviewed_proposal | ready | ready | ready | missing_conformance |
| `relationships.forget` | relationships | reviewed_proposal | ready | ready | ready | missing_conformance |
| `relationships.forget_person` | relationships | supported_boundary | excluded | excluded | boundary | excluded |
| `household.read` | household | direct | ready | ready | ready | missing_conformance |
| `household.member.add_dependent` | household | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `household.invitation.create` | household | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `household.invitation.preview` | household | direct | ready | ready | ready | missing_conformance |
| `household.invitation.accept` | household | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `household.child_capability.update` | household | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `household.caregiver_grant.update` | household | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
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
| `activities.capture` | todos | reviewed_proposal | ready | ready | ready | missing_conformance |
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
| `chores.open` | chores | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.search` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.read` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.create` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.import.prepare` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.import.approve` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.update` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.scale.preview` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.fork` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.share_copy.prepare` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.collaborator.invite` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.prepare` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.publish` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `recipes.publication.attest_rights` | recipes | supported_boundary | excluded | excluded | boundary | excluded |
| `recipes.delete` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.create` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.update` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidate.add` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidate.remove` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.round.open` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.round.close` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.response.submit` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.response.withdraw` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.finalize` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.plan.revise` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `meal_planning.candidates.prepare` | meal_planning | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_budget.read` | savings | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.read` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.observe` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_stock.deplete` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.compile` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.add` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.update` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.item.set_state` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.list.review` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.product_match.prepare` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.product_match.confirm` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.handoff.prepare` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.handoff.open` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `groceries.checkout` | groceries | supported_boundary | excluded | excluded | boundary | excluded |
| `groceries.payment` | groceries | supported_boundary | excluded | excluded | boundary | excluded |
| `store_opportunity.capture` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_scenario.prepare` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `food_scenario.accept` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.review` | savings | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.accept` | savings | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `savings.coupon.apply_unsupported` | savings | supported_boundary | excluded | excluded | boundary | excluded |
| `savings.coupon.open` | savings | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `receipt.extract` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `receipt.reconcile` | groceries | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.read` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.start` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.control` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `cook_session.complete` | recipes | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.read` | screenTime | direct | ready | ready | ready | missing_conformance |
| `screen_time.agreement.create` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.agreement.update` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.agreement.deactivate` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.block` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.allow` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.override.cancel` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.request.decide` | screenTime | reviewed_proposal | ready | ready | ready | missing_conformance |
| `screen_time.personal.setup.open` | screenTime | native_handoff | ready | missing_provider | missing_provider | missing_conformance |
| `screen_time.personal.limit.open` | screenTime | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.selection.open` | screenTime | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.device.setup.open` | screenTime | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.device.release.open` | screenTime | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |
| `screen_time.configure` | screenTime | supported_boundary | missing_provider | missing_provider | missing_proof | missing_conformance |
| `notifications.configure` | notifications | native_handoff | ready | ready | ready | missing_conformance |
| `search.open` | navigation | native_handoff | ready | ready | ready | missing_conformance |
| `account.settings.open` | account | native_handoff | ready | ready | ready | missing_conformance |
| `account.subscription.manage` | account | native_handoff | ready | ready | ready | missing_conformance |
| `account.delete` | account | native_handoff | ready | ready | ready | missing_conformance |
| `channel.phone.continue_run` | channels | supported_boundary | missing_provider | missing_provider | missing_provider | missing_conformance |

## Final parity errors

- Unresolved UI gap household.member.update on household-settings: Native Household supports member editing, but no canonical Chat operation covers it.
- Unresolved UI gap household.member.remove on household-settings: Removal changes dependent authority and needs a reviewed, reversible Household operation.
- Unresolved UI gap household.device.manage on household-settings: Device management exists natively but only setup and release handoffs are currently classified.
- Unresolved UI gap plan.availability.update on plan: Chat can open the native owner but cannot yet stage an exact availability diff.
- Unresolved UI gap plan.calendars.update on plan: Calendar authorization and provider selection remain native-only settings.
- Unresolved UI gap settings.weekly_chapters.update on chapters: Digest cadence and delivery settings have no canonical operation yet.
- Unresolved UI gap chapters.align on chapters: The native alignment surface changes Activities and needs an explicit reviewed operation.
- Unresolved UI gap settings.appearance.update on account-settings: Theme and display preferences are device-local and need a bounded settings provider.
- Unresolved UI gap settings.ai_model.update on account-settings: Model selection affects cost and behavior and has no canonical reviewed operation.
- Unresolved UI gap settings.phone_agent.update on account-settings: Phone Agent enrollment and permissions have no direct conversational settings contract.
- Unresolved UI gap settings.connected_tools.manage on account-settings: OAuth connections require dedicated secure review and revocation operations.
- Unresolved UI gap settings.sharing.manage on account-settings: The general sharing inventory is broader than Goal and To-do share handoffs.
- Unresolved UI gap settings.haptics.update on account-settings: This device-local preference has no canonical operation.
- Unresolved UI gap settings.widgets.configure on account-settings: Widget installation and placement remain OS-owned; Kwilt preferences still need a bounded handoff.
- Unresolved UI gap settings.execution_targets.manage on account-settings: Execution targets can contain provider authority and need typed review.
- Unresolved UI gap settings.destinations.manage on account-settings: Destination definitions are user data with no canonical Chat operation.
- Unresolved UI gap settings.activity_areas.manage on account-settings: Activity-area editing exists natively but is not represented in the operation manifest.
- Unresolved UI gap money.budget.update on money: Budget edits are a main Money action but have no canonical reviewed operation.
- Unresolved UI gap money.transaction.update on money: The current boundary only opens native review; it cannot stage the exact change.
- Unresolved UI gap money.connection.disconnect on money: Connection removal and repair are absent from the operation manifest.
- Unresolved UI gap money.transfer.review on money: Transfer semantics are visible in Money but not independently controllable from Chat.
- Unresolved UI gap chores.read on chores: The main Chores inventory is not available as bounded Chat evidence.
- Unresolved UI gap chores.definition.manage on chores: Chore-series management has no canonical operations.
- Unresolved UI gap chores.occurrence.complete on chores: Occurrence completion and evidence policy are absent from the Chat contract.
- Unresolved UI gap chores.review.decide on chores: Caregiver review is consequential and needs a typed reviewed operation.
- Unresolved UI gap chores.reward.manage on chores: Reward state is not represented in the operation manifest.
- Unresolved UI gap recipes.favorite.update on recipes: Favorites are a main library action without a canonical operation.
- Unresolved UI gap recipes.visibility.update on recipes: Recipe visibility preferences are not represented in the operation manifest.
- Unresolved UI gap settings.meals.update on meal-planning: Meal settings and household preferences have no canonical Chat operation.
- Unresolved UI gap screen_time.personal_rule.read on screen-time: Personal rule inventory is not yet projected as structured Chat evidence.
- Unresolved UI gap screen_time.personal_rule.deactivate on screen-time: The native editor supports rule lifecycle changes without an equivalent canonical operation.
- Unresolved UI gap notifications.preferences.update on notifications: Chat can open settings but cannot stage a typed preference diff.
- Unresolved UI gap navigation.open_capability on navigation: Navigation handoffs exist piecemeal but are not one typed, discoverable contract.
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
- household.member.add_dependent mobile is missing_provider
- household.member.add_dependent phone is missing_provider
- household.member.add_dependent external is missing_provider
- household.member.add_dependent voice is missing_conformance
- household.member.add_dependent has no proof paths
- household.invitation.create mobile is missing_provider
- household.invitation.create phone is missing_provider
- household.invitation.create external is missing_provider
- household.invitation.create voice is missing_conformance
- household.invitation.create has no proof paths
- household.invitation.preview voice is missing_conformance
- household.invitation.accept mobile is missing_provider
- household.invitation.accept phone is missing_provider
- household.invitation.accept external is missing_provider
- household.invitation.accept voice is missing_conformance
- household.invitation.accept has no proof paths
- household.child_capability.update mobile is missing_provider
- household.child_capability.update phone is missing_provider
- household.child_capability.update external is missing_provider
- household.child_capability.update voice is missing_conformance
- household.child_capability.update has no proof paths
- household.caregiver_grant.update mobile is missing_provider
- household.caregiver_grant.update phone is missing_provider
- household.caregiver_grant.update external is missing_provider
- household.caregiver_grant.update voice is missing_conformance
- household.caregiver_grant.update has no proof paths
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
- chores.open mobile is missing_provider
- chores.open phone is missing_provider
- chores.open external is missing_provider
- chores.open voice is missing_conformance
- chores.open has no proof paths
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
- screen_time.personal.setup.open phone is missing_provider
- screen_time.personal.setup.open external is missing_provider
- screen_time.personal.setup.open voice is missing_conformance
- screen_time.personal.limit.open mobile is missing_provider
- screen_time.personal.limit.open phone is missing_provider
- screen_time.personal.limit.open external is missing_provider
- screen_time.personal.limit.open voice is missing_conformance
- screen_time.personal.limit.open has no proof paths
- screen_time.selection.open mobile is missing_provider
- screen_time.selection.open phone is missing_provider
- screen_time.selection.open external is missing_provider
- screen_time.selection.open voice is missing_conformance
- screen_time.selection.open has no proof paths
- screen_time.device.setup.open mobile is missing_provider
- screen_time.device.setup.open phone is missing_provider
- screen_time.device.setup.open external is missing_provider
- screen_time.device.setup.open voice is missing_conformance
- screen_time.device.setup.open has no proof paths
- screen_time.device.release.open mobile is missing_provider
- screen_time.device.release.open phone is missing_provider
- screen_time.device.release.open external is missing_provider
- screen_time.device.release.open voice is missing_conformance
- screen_time.device.release.open has no proof paths
- screen_time.configure mobile is missing_provider
- screen_time.configure phone is missing_provider
- screen_time.configure external is missing_proof
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
