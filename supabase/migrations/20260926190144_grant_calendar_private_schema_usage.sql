-- Public SECURITY INVOKER wrappers need schema access to call their explicitly
-- granted implementations. This does not expose private through the Data API.
GRANT USAGE ON SCHEMA private TO authenticated;
