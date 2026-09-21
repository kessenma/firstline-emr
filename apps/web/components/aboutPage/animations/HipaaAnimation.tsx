"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useTransform, useInView } from "framer-motion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ServerCog,
  KeyRound,
  RefreshCw,
  HardDrive,
  Video,
  Languages,
  Bell,
  Database,
  Shield,
  Wifi,
  BarChart3,
} from "lucide-react";

interface HipaaItem {
  id: string;
  label: string;
  icons: React.ReactNode[];
}

export function HipaaAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const items: HipaaItem[] = useMemo(
    () => [
      { id: "sso-auth", label: "SSO Authentication", icons: [<KeyRound key="sso" className="w-6 h-6" />] },
      { id: "offline-sync", label: "Offline Sync", icons: [<RefreshCw key="sync" className="w-6 h-6" />] },
      { id: "object-storage", label: "Object Storage", icons: [<HardDrive key="storage" className="w-6 h-6" />] },
      { id: "video-calls", label: "Video Calling", icons: [<Video key="video" className="w-6 h-6" />] },
      { id: "translation", label: "AR↔EN Translation", icons: [<Languages key="translate" className="w-6 h-6" />] },
      { id: "push-notifications", label: "Push Notifications", icons: [<Bell key="notify" className="w-6 h-6" />] },
    ],
    []
  );

  const rotation = useMotionValue(0);
  const counterRotation = useTransform(rotation, (v) => -v);
  const baseSpeed = 10;

  const isInView = useInView(containerRef, { amount: 0.2 });

  useEffect(() => {
    if (!isInView) return;
    let raf: number;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      const next = rotation.get() + baseSpeed * dt;
      rotation.set(next % 360);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, rotation]);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="mx-auto max-w-5xl text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Self-Hosted, HIPAA-Compliant Infrastructure</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All services run on isolated, self-hosted infrastructure with no external cloud dependencies for patient data.
        </p>
      </div>

      <div className="mt-3 flex justify-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="text-foreground">
              Learn more
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Infrastructure Services</SheetTitle>
              <SheetDescription>
                FAJR.EMR runs on a fully self-hosted infrastructure stack designed for medical mission environments.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="stack-zitadel">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><KeyRound className="w-4 h-4" /> Zitadel SSO</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Central identity provider with passkey/WebAuthn support. Single sign-on across all services using OAuth2/OIDC standards.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Enables secure, passwordless authentication for mission teams.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-powersync">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><RefreshCw className="w-4 h-4" /> PowerSync</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Real-time offline synchronization server. Works in low-connectivity environments with automatic conflict resolution.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Critical for mission work where internet access is unreliable.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-rustfs">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><HardDrive className="w-4 h-4" /> RustFS Storage</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      On-prem S3-compatible object storage for medical images and documents. Self-hosted with no cloud dependency.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Patient data never leaves controlled infrastructure.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-livekit">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><Video className="w-4 h-4" /> LiveKit</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      WebRTC-based video calling for remote consultations. Low-latency, encrypted end-to-end communication.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Enables pre-mission case review and post-operative follow-up.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-translation">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><Languages className="w-4 h-4" /> Translation Service</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      On-prem HuggingFace models for Arabic↔English translation. Real-time message translation in Telegram interface.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      No external API dependencies—patient privacy preserved.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-gorush">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><Bell className="w-4 h-4" /> Gorush Notifications</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      iOS APNs push notification server. Real-time alerts for patient updates and mission-critical notifications.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Keeps mission teams informed even when not actively using the app.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stack-drizzle">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-foreground"><BarChart3 className="w-4 h-4" /> Drizzle Studio</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Protected analytics dashboard for database insights. SSO-protected access for mission metrics and reporting.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Enables data-driven mission planning and outcome tracking.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="relative" style={{ width: 380, height: 380 }}>
          <motion.div
            style={{ rotate: rotation }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative" style={{ width: 320, height: 320 }}>
              {items.map((item, index) => {
                const angle = (index / items.length) * Math.PI * 2;
                const r = 130;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <div
                    key={item.id}
                    className="absolute flex flex-col items-center justify-center"
                    style={{ left: Math.round(160 + x), top: Math.round(160 + y), transform: "translate(-50%, -50%)" }}
                  >
                    <motion.div style={{ rotate: counterRotation }} className="flex flex-col items-center">
                      <div className="text-foreground flex items-center gap-1.5">
                        {item.icons.map((ic, i) => (
                          <span key={`${item.id}-${i}`}>{ic}</span>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
                        {item.label}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center gap-2">
              <div className="text-foreground">
                <ServerCog className="w-10 h-10" />
              </div>
              <div className="text-sm font-medium text-center leading-tight">Self-Hosted<br />Infrastructure</div>
            </div>
        
      </div>
    </div>
    </div>
    </div>
  );
}
