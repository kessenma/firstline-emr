// apps/web/app/api/admin/notifications/validate-apns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const gorushUrl =
      process.env.GORUSH_URL || "http://gorush:8088";

    const diagnostics: {
      gorush_reachable: boolean;
      gorush_config: any;
      apns_configuration: {
        enabled: boolean;
        key_type: string;
        key_id: string;
        team_id: string;
        production: boolean;
        key_exists: boolean;
      } | null;
      errors: string[];
      warnings: string[];
    } = {
      gorush_reachable: false,
      gorush_config: null,
      apns_configuration: null,
      errors: [],
      warnings: [],
    };

    // Check 1: Is Gorush reachable?
    try {
      const healthResponse = await fetch(`${gorushUrl}/healthz`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (healthResponse.ok) {
        diagnostics.gorush_reachable = true;
      } else {
        diagnostics.errors.push(
          `Gorush health check failed: ${healthResponse.status}`,
        );
      }
    } catch (error) {
      diagnostics.gorush_reachable = false;
      diagnostics.errors.push(
        `Cannot reach Gorush at ${gorushUrl}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Check 2: Get Gorush configuration
    if (diagnostics.gorush_reachable) {
      try {
        const configResponse = await fetch(`${gorushUrl}/api/config`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
        });

        if (configResponse.ok) {
          const config = await configResponse.json();
          diagnostics.gorush_config = config;

          // Extract APNs configuration
          if (config?.ios) {
            diagnostics.apns_configuration = {
              enabled: config.ios.enabled || false,
              key_type: config.ios.key_type || "unknown",
              key_id: config.ios.key_id || "",
              team_id: config.ios.team_id || "",
              production: config.ios.production || false,
              key_exists: !!config.ios.key_path,
            };

            // Validate configuration
            if (!config.ios.enabled) {
              diagnostics.errors.push("iOS push notifications are DISABLED in Gorush");
            }

            if (!config.ios.key_id) {
              diagnostics.errors.push("APNs Key ID is not configured");
            }

            if (!config.ios.team_id) {
              diagnostics.errors.push("APNs Team ID is not configured");
            }

            if (!config.ios.key_path) {
              diagnostics.errors.push("APNs Key Path is not configured");
            }

            // Production vs Development warning
            if (config.ios.production) {
              diagnostics.warnings.push(
                "Gorush is configured for PRODUCTION APNs. TestFlight builds require DEVELOPMENT mode (production: false)",
              );
            } else {
              diagnostics.warnings.push(
                "Gorush is configured for DEVELOPMENT APNs. This is correct for TestFlight, but App Store releases require PRODUCTION mode.",
              );
            }

            // Key type validation
            if (config.ios.key_type !== "p8") {
              diagnostics.warnings.push(
                `Key type is '${config.ios.key_type}'. Expected 'p8' for modern APNs authentication.`,
              );
            }
          } else {
            diagnostics.errors.push("iOS configuration not found in Gorush config");
          }
        } else {
          diagnostics.errors.push(
            `Failed to fetch Gorush config: ${configResponse.status}`,
          );
        }
      } catch (error) {
        diagnostics.errors.push(
          `Error fetching Gorush config: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Check 3: Verify environment variables
    const envChecks = {
      GORUSH_URL: !!process.env.GORUSH_URL,
      APNS_KEY_BASE64: !!process.env.APNS_KEY_BASE64,
      NOTIFICATIONS_SERVER_URL: !!process.env.NOTIFICATIONS_SERVER_URL,
    };

    if (!envChecks.APNS_KEY_BASE64) {
      diagnostics.warnings.push(
        "APNS_KEY_BASE64 environment variable not set (might be set in docker-compose)",
      );
    }

    // Overall assessment
    const isHealthy =
      diagnostics.gorush_reachable &&
      diagnostics.apns_configuration?.enabled &&
      diagnostics.apns_configuration?.key_id &&
      diagnostics.apns_configuration?.team_id &&
      diagnostics.errors.length === 0;

    return NextResponse.json({
      status: isHealthy ? "healthy" : "unhealthy",
      gorush_url: gorushUrl,
      diagnostics,
      environment: envChecks,
      timestamp: new Date().toISOString(),
      summary: {
        total_errors: diagnostics.errors.length,
        total_warnings: diagnostics.warnings.length,
        can_send_notifications: isHealthy,
      },
    });
  } catch (error) {
    console.error("❌ Error validating APNs configuration:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
