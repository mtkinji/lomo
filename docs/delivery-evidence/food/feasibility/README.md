# Food provider feasibility evidence

This directory may contain redacted, explicitly generated live feasibility
reports. It must never contain API keys, OAuth tokens, request URLs with query
strings, retailer account identifiers, product names, ingredient text, Recipe
content, source images, or raw provider response bodies.

Fixture proof:

```bash
npm run food:feasibility -- --fixture-dir scripts/fixtures/food-providers --output /tmp/kwilt-food-feasibility.json
npm run food:import-corpus -- --fixture-dir scripts/fixtures/recipe-import --output /tmp/kwilt-food-import.json
```

Live provider mode requires a caller-supplied output path under this directory.
The probe recognizes these environment variables but never emits their values:

- `INSTACART_DEVELOPER_PLATFORM_API_KEY`
- `KROGER_CLIENT_ID`
- `KROGER_CLIENT_SECRET`
- `KROGER_CUSTOMER_ACCESS_TOKEN` and `KROGER_TEST_UPC` for the separately
  authorized cart-add probe

Absence of credentials is `blocked_by_access`, not proof that a provider is
technically impossible. A successful list-link call is not an order; a
successful Kroger cart-add is not checkout; price promotion evidence is not a
coupon activation.

Provider endpoints and request shapes must be rechecked against current
official documentation before every live run. The runtime product cannot depend
on these feasibility scripts.
