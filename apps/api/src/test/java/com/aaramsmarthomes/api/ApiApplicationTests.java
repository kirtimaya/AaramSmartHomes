package com.aaramsmarthomes.api;

import org.junit.jupiter.api.Test;

// Full context startup requires a live DB + Supabase JWKS.
// Use slice tests (@WebMvcTest) for controller logic; skip context load here.
class ApiApplicationTests {

	@Test
	void placeholder() {
		// Integration tests run against a real environment, not in CI without env vars.
	}

}
