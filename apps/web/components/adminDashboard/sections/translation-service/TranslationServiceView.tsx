"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Activity,
  Clock,
  Database,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Trash2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  TrendingUp,
  Download,
} from "lucide-react";
import { useTranslationServiceViewModel } from "./TranslationServiceViewModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Props = {
  isDialog?: boolean;
};

const TranslationServiceView: React.FC<Props> = () => {
  const {
    healthData,
    isLoading,
    error,
    lastChecked,
    autoRefresh,
    testHistory,
    isTestingTranslation,
    serviceUrl,
    checkHealth,
    testTranslation,
    clearTestHistory,
    toggleAutoRefresh,
    cacheStats,
    isClearingCache,
    fetchCacheStats,
    clearCache,
    formatUptime,
    formatDuration,
    formatFileSize,
    getStatusColor,
    getStatusBadgeColor,
  } = useTranslationServiceViewModel();

  const [testText, setTestText] = useState("مرحبا");
  const [testDirection, setTestDirection] = useState<"ar-en" | "en-ar">(
    "ar-en",
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestTranslation = async () => {
    const targetLang = testDirection === "ar-en" ? "English" : "Arabic";
    await testTranslation(testText, targetLang);
  };

  const handleClearCache = async () => {
    const result = await clearCache();
    if (result.success) {
      // Success feedback handled by toast or similar
      console.log("Cache cleared successfully");
    } else {
      console.error("Failed to clear cache:", result.error);
    }
  };

  const switchDirection = () => {
    setTestDirection((prev) => (prev === "ar-en" ? "en-ar" : "ar-en"));
    // Set example text based on direction
    if (testDirection === "ar-en") {
      setTestText("Hello");
    } else {
      setTestText("مرحبا");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Translation Service Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor health, performance, and test the Arabic-English translation
            service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
            className="gap-2"
          >
            <Activity
              className={`w-4 h-4 ${autoRefresh ? "animate-pulse" : ""}`}
            />
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Check Health
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-destructive">
                  Service Unavailable
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  The translation service may be offline or experiencing issues.
                  Check that the service is running and properly configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                {healthData?.status === "healthy" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Badge
                      className={
                        healthData
                          ? getStatusBadgeColor(healthData.status)
                          : "bg-gray-100"
                      }
                    >
                      {healthData?.status || "Unknown"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {lastChecked
                    ? `Last checked: ${lastChecked.toLocaleTimeString()}`
                    : "Not checked yet"}
                </p>
              </CardContent>
            </Card>

            {/* Uptime Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData?.uptime_seconds
                    ? formatUptime(healthData.uptime_seconds)
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Service running time
                </p>
              </CardContent>
            </Card>

            {/* Cache Size Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cache Size
                </CardTitle>
                <Database className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cacheStats
                    ? `${cacheStats.cache_size}/${cacheStats.max_size}`
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {cacheStats
                    ? `${cacheStats.hit_rate}% hit rate`
                    : "Cached translations"}
                </p>
              </CardContent>
            </Card>

            {/* Model Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Model Status
                </CardTitle>
                <Server className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData?.models_loaded?.any_model_loaded ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Loaded
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                      Not Loaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {healthData?.models_loaded?.model_name || "No model info"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cache Statistics Card */}
          {cacheStats && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Cache Statistics</CardTitle>
                    <CardDescription>
                      Translation cache performance metrics
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearingCache || cacheStats.cache_size === 0}
                    className="gap-2"
                  >
                    {isClearingCache ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Clear Cache
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Cache Hits
                      </span>
                      <span className="text-sm font-mono font-bold text-green-600">
                        {cacheStats.hits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Cache Misses
                      </span>
                      <span className="text-sm font-mono font-bold text-yellow-600">
                        {cacheStats.misses}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Hit Rate
                      </span>
                      <span className="text-sm font-mono font-bold">
                        {cacheStats.hit_rate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Evictions
                      </span>
                      <span className="text-sm font-mono font-bold text-red-600">
                        {cacheStats.evictions}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Size
                      </span>
                      <span className="text-sm font-mono font-bold">
                        {cacheStats.cache_size}/{cacheStats.max_size}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">TTL</span>
                      <span className="text-sm font-mono">
                        {Math.floor(cacheStats.eviction_time_seconds / 86400)}d
                      </span>
                    </div>
                  </div>
                </div>
                {cacheStats.cache_size > cacheStats.max_size * 0.8 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        Cache is{" "}
                        {Math.round(
                          (cacheStats.cache_size / cacheStats.max_size) * 100,
                        )}
                        % full. Consider clearing cache or increasing
                        TRANSLATION_CACHE_MAX_SIZE.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration Card */}
          {healthData?.config && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>
                  Current service configuration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Server className="w-4 h-4" />
                      <span className="font-medium">Service Port</span>
                    </div>
                    <p className="text-2xl font-mono font-bold">
                      {healthData.config.port}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TRANSLATION_PORT
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Database className="w-4 h-4" />
                      <span className="font-medium">Max Cache Size</span>
                    </div>
                    <p className="text-2xl font-mono font-bold">
                      {healthData.config.cache_max_size.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TRANSLATION_CACHE_MAX_SIZE
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Cache TTL</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatDuration(
                        healthData.config.cache_eviction_time_seconds,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TRANSLATION_CACHE_EVICTION_TIME
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      These values are loaded from environment variables when
                      the service starts. To change them, update your .env file
                      and restart the service.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Download Progress */}
          {healthData?.download_progress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Model Download Progress
                </CardTitle>
                <CardDescription>
                  Translation model download and loading status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Arabic to English Model */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Arabic → English Model
                        </span>
                        {healthData.download_progress.ar_en.status ===
                          "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {healthData.download_progress.ar_en.status ===
                          "downloading" && (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        )}
                        {healthData.download_progress.ar_en.status ===
                          "error" && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {healthData.download_progress.ar_en.status ===
                          "pending" && (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            healthData.download_progress.ar_en.status ===
                            "completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : healthData.download_progress.ar_en.status ===
                                  "downloading"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : healthData.download_progress.ar_en.status ===
                                    "error"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {healthData.download_progress.ar_en.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {healthData.download_progress.ar_en.downloaded_mb > 0
                            ? `${formatFileSize(healthData.download_progress.ar_en.downloaded_mb)} / ${formatFileSize(healthData.download_progress.ar_en.total_mb)}`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {healthData.download_progress.ar_en.status ===
                      "downloading" && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${healthData.download_progress.ar_en.progress_percent}%`,
                          }}
                        ></div>
                      </div>
                    )}

                    {healthData.download_progress.ar_en.status ===
                      "completed" && (
                      <div className="w-full bg-green-200 rounded-full h-2.5 dark:bg-green-900">
                        <div className="bg-green-600 h-2.5 rounded-full w-full"></div>
                      </div>
                    )}

                    {healthData.download_progress.ar_en.error && (
                      <p className="text-xs text-red-600">
                        Error: {healthData.download_progress.ar_en.error}
                      </p>
                    )}
                  </div>

                  {/* English to Arabic Model */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          English → Arabic Model
                        </span>
                        {healthData.download_progress.en_ar.status ===
                          "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {healthData.download_progress.en_ar.status ===
                          "downloading" && (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        )}
                        {healthData.download_progress.en_ar.status ===
                          "error" && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {healthData.download_progress.en_ar.status ===
                          "pending" && (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            healthData.download_progress.en_ar.status ===
                            "completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : healthData.download_progress.en_ar.status ===
                                  "downloading"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : healthData.download_progress.en_ar.status ===
                                    "error"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {healthData.download_progress.en_ar.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {healthData.download_progress.en_ar.downloaded_mb > 0
                            ? `${formatFileSize(healthData.download_progress.en_ar.downloaded_mb)} / ${formatFileSize(healthData.download_progress.en_ar.total_mb)}`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {healthData.download_progress.en_ar.status ===
                      "downloading" && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${healthData.download_progress.en_ar.progress_percent}%`,
                          }}
                        ></div>
                      </div>
                    )}

                    {healthData.download_progress.en_ar.status ===
                      "completed" && (
                      <div className="w-full bg-green-200 rounded-full h-2.5 dark:bg-green-900">
                        <div className="bg-green-600 h-2.5 rounded-full w-full"></div>
                      </div>
                    )}

                    {healthData.download_progress.en_ar.error && (
                      <p className="text-xs text-red-600">
                        Error: {healthData.download_progress.en_ar.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info banner for downloading state */}
                {(healthData.download_progress.ar_en.status === "downloading" ||
                  healthData.download_progress.en_ar.status ===
                    "downloading") && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        Models are being downloaded from HuggingFace. This
                        happens on first startup and may take a few minutes
                        depending on your connection speed.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Model Details */}
          {healthData?.models_loaded && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Information</CardTitle>
                <CardDescription>
                  Details about the loaded translation models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        AR→EN Model
                      </span>
                      {healthData.models_loaded.transformers_ar_en_loaded ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        EN→AR Model
                      </span>
                      {healthData.models_loaded.transformers_en_ar_loaded ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        CTranslate2
                      </span>
                      {healthData.models_loaded.ctranslate2_loaded ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        AR→EN
                      </span>
                      <span className="text-xs font-mono">
                        {healthData.models_loaded.model_ar_en || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        EN→AR
                      </span>
                      <span className="text-xs font-mono">
                        {healthData.models_loaded.model_en_ar || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Load Time
                      </span>
                      <span className="text-sm font-mono">
                        {healthData.models_loaded.load_time_seconds
                          ? `${healthData.models_loaded.load_time_seconds}s`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Translation</CardTitle>
              <CardDescription>
                Send a test translation request to verify the service is working
                correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Translation Direction Selector */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      testDirection === "ar-en" ? "default" : "secondary"
                    }
                  >
                    {testDirection === "ar-en"
                      ? "Arabic → English"
                      : "English → Arabic"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={switchDirection}
                    className="gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Switch
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {testDirection === "ar-en" ? "AR → EN" : "EN → AR"}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testText">
                  {testDirection === "ar-en"
                    ? "Arabic Text to Translate"
                    : "English Text to Translate"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="testText"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder={testDirection === "ar-en" ? "مرحبا" : "Hello"}
                    className={testDirection === "ar-en" ? "font-arabic" : ""}
                    dir={testDirection === "ar-en" ? "rtl" : "ltr"}
                  />
                  <Button
                    onClick={handleTestTranslation}
                    disabled={isTestingTranslation || !testText.trim()}
                    className="gap-2 shrink-0"
                  >
                    {isTestingTranslation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter {testDirection === "ar-en" ? "Arabic" : "English"} text
                  to test the translation service
                </p>
              </div>

              {/* Quick Test Buttons */}
              <div className="flex flex-wrap gap-2">
                {testDirection === "ar-en" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("مرحبا")}
                      className="text-xs"
                    >
                      مرحبا (Hello)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("شكرا لك")}
                      className="text-xs"
                    >
                      شكرا لك (Thank you)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("كيف حالك؟")}
                      className="text-xs"
                    >
                      كيف حالك؟ (How are you?)
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("Hello")}
                      className="text-xs"
                    >
                      Hello
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("Thank you")}
                      className="text-xs"
                    >
                      Thank you
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestText("How are you?")}
                      className="text-xs"
                    >
                      How are you?
                    </Button>
                  </>
                )}
              </div>

              {/* Test History */}
              {testHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Recent Tests</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTestHistory}
                      className="gap-2 h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {testHistory.map((test, index) => (
                      <Card
                        key={index}
                        className={
                          test.error ? "border-destructive" : "border-border"
                        }
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {test.error ? (
                                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                  >
                                    {test.direction === "ar-en"
                                      ? "AR→EN"
                                      : "EN→AR"}
                                  </Badge>
                                  <span
                                    className="text-sm font-medium truncate"
                                    dir={
                                      test.direction === "ar-en" ? "rtl" : "ltr"
                                    }
                                  >
                                    {test.text}
                                  </span>
                                </div>
                                {test.translatedText && (
                                  <p
                                    className="text-sm text-muted-foreground pl-6"
                                    dir={
                                      test.direction === "ar-en" ? "ltr" : "rtl"
                                    }
                                  >
                                    → {test.translatedText}
                                  </p>
                                )}
                                {test.error && (
                                  <p className="text-xs text-destructive pl-6">
                                    {test.error}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  {test.duration}ms
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {test.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Configuration</CardTitle>
              <CardDescription>
                Connection and configuration details for the translation service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-sm bg-muted rounded-md font-mono">
                    {serviceUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(serviceUrl)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Authentication</Label>
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-muted rounded-md">
                  {process.env.NEXT_PUBLIC_TRANSLATION_API_KEY ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>API Key Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span>No API Key (Insecure)</span>
                    </>
                  )}
                </div>
              </div>

              {healthData?.timestamp && (
                <div className="space-y-2">
                  <Label>Last Health Check</Label>
                  <div className="px-3 py-2 text-sm bg-muted rounded-md font-mono">
                    {new Date(healthData.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Advanced Information</CardTitle>
                  <CardDescription>
                    Detailed technical information and diagnostics
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Raw Health Response
                    </Label>
                    <pre className="mt-2 p-4 text-xs bg-muted rounded-md overflow-x-auto">
                      {healthData
                        ? JSON.stringify(healthData, null, 2)
                        : "No data available"}
                    </pre>
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="troubleshooting">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          <span>Troubleshooting Tips</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium">
                              Service Not Responding:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1 ml-4">
                              <li>
                                Check that the translation service container is
                                running
                              </li>
                              <li>
                                Verify the TRANSLATION_SERVICE_URL environment
                                variable
                              </li>
                              <li>
                                Ensure both services are on the same Docker
                                network
                              </li>
                              <li>
                                Check firewall rules and port accessibility
                              </li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">
                              Authentication Errors:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1 ml-4">
                              <li>
                                Verify TRANSLATION_API_KEY matches in both
                                services
                              </li>
                              <li>
                                Check that the API key is not empty or malformed
                              </li>
                              <li>
                                Restart services after changing environment
                                variables
                              </li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">Model Not Loaded:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1 ml-4">
                              <li>
                                First translation may take 30-90s (model
                                download)
                              </li>
                              <li>
                                Check service logs for model loading errors
                              </li>
                              <li>
                                Ensure sufficient memory is available (2-4GB)
                              </li>
                              <li>
                                Verify internet connection for initial model
                                download
                              </li>
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranslationServiceView;
