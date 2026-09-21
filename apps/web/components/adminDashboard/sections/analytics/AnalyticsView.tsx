'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Maximize2, Minimize2, Info, Eye, EyeOff } from 'lucide-react';
import { useAnalyticsViewModel } from './useAnalyticsViewModel';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useAdminConfig } from '@/components/adminDashboard/context/AdminConfigContext';
import { CopyButton } from '@/components/ui/CopyButton';

type Props = {
  isDialog?: boolean;
};

const AnalyticsView: React.FC<Props> = () => {
  const { url, isFullscreen, openExternal, toggleFullscreen } = useAnalyticsViewModel();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { analyticsPassphrase } = useAdminConfig();
  const [showPassphrase, setShowPassphrase] = useState(false);

  const popoverContent = (
    <div className="space-y-3">
      <div className="text-sm font-medium">Analytics Login</div>
      <div className="text-xs text-muted-foreground">
        Use your MedFlow account credentials (same login as the app).
      </div>
      {analyticsPassphrase && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Passphrase</label>
          <div className="flex gap-2">
            <Input readOnly type={showPassphrase ? 'text' : 'password'} value={analyticsPassphrase} />
            <Button variant="outline" size="icon" onClick={() => setShowPassphrase((v) => !v)} aria-label="Toggle Passphrase Visibility">
              {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <CopyButton textToCopy={analyticsPassphrase} label="Passphrase" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">URL</label>
        <div className="flex gap-2">
          <Input readOnly value={url} />
          <CopyButton textToCopy={url} label="URL" />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Note: Some sites block auto-loading in iframes. You can open the dashboard in a new tab or try loading it below.
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          View the Analytics Dashboard inside the admin panel.
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Analytics login info">
                <Info className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              {popoverContent}
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={openExternal} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in new tab
          </Button>
          <Button variant="secondary" onClick={toggleFullscreen} className="gap-2">
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <div className="relative w-full h-[600px] rounded-md overflow-hidden border border-border shadow-sm bg-card">
        {iframeLoaded ? (
          <iframe
            src={url}
            title="Analytics Dashboard"
            className="w-full h-full"
            loading="lazy"
            allow="fullscreen"
            sandbox="allow-forms allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            onLoad={() => setIframeLoaded(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-6 text-center">
            <div className="space-y-3 max-w-md">
              <div className="text-sm text-muted-foreground">
                Embedding may be blocked by the external site. You can still open the dashboard in a new tab or try loading it below.
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={openExternal} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </Button>
                <Button variant="secondary" onClick={() => setIframeLoaded(true)}>
                  Load Dashboard Here
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center justify-end gap-2 p-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Analytics login info">
                    <Info className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  {popoverContent}
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={openExternal} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </Button>
              <Button variant="secondary" onClick={toggleFullscreen} className="gap-2">
                <Minimize2 className="w-4 h-4" />
                Exit Fullscreen
              </Button>
            </div>
            <div className="flex-1 p-3">
              <div className="w-full h-full rounded-md overflow-hidden bg-card">
                {iframeLoaded ? (
                  <iframe
                    src={url}
                    title="Analytics Dashboard Fullscreen"
                    className="w-full h-full"
                    loading="lazy"
                    allow="fullscreen"
                    sandbox="allow-forms allow-scripts allow-same-origin"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center p-6 text-center">
                    <div className="space-y-3 max-w-md">
                      <div className="text-sm text-muted-foreground">
                        Embedding may be blocked by the external site. Try loading here or open in a new tab.
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" onClick={openExternal} className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Open in new tab
                        </Button>
                        <Button variant="secondary" onClick={() => setIframeLoaded(true)}>
                          Load Dashboard Here
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
