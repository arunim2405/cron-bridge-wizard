
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, Clock, ArrowRight, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [unixCron, setUnixCron] = useState("0 9 * * 1");
  const [eventBridgeCron, setEventBridgeCron] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const convertCronToEventBridge = (cronExpression: string) => {
    try {
      // Remove extra whitespace and split
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5) {
        throw new Error("Unix cron must have exactly 5 fields: minute hour day month day-of-week");
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // Convert day of week (Unix: 0=Sunday, EventBridge: 1=Sunday)
      let convertedDayOfWeek = dayOfWeek;
      if (dayOfWeek !== "*" && dayOfWeek !== "?") {
        // Handle ranges and lists
        convertedDayOfWeek = dayOfWeek.replace(/\b0\b/g, "7").replace(/\b([1-6])\b/g, (match, p1) => String(parseInt(p1) + 1));
      }

      // EventBridge format: minute hour day-of-month month day-of-week year
      // Add wildcard for year as the 6th field
      const eventBridgeExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${convertedDayOfWeek} *`;
      
      return eventBridgeExpression;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Invalid cron expression");
    }
  };

  const validateCronExpression = (cronExpression: string) => {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    
    // Basic validation - each part should contain valid cron characters
    const cronRegex = /^[\d\*\-\,\/\?]+$/;
    return parts.every(part => cronRegex.test(part));
  };

  useEffect(() => {
    if (!unixCron.trim()) {
      setEventBridgeCron("");
      setIsValid(true);
      setError("");
      return;
    }

    try {
      if (!validateCronExpression(unixCron)) {
        throw new Error("Invalid cron expression format");
      }
      
      const converted = convertCronToEventBridge(unixCron);
      setEventBridgeCron(converted);
      setIsValid(true);
      setError("");
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : "Invalid expression");
      setEventBridgeCron("");
    }
  }, [unixCron]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "EventBridge cron expression copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const examples = [
    { unix: "0 9 * * 1", description: "Every Monday at 9:00 AM", eventbridge: "0 9 * * 2 *" },
    { unix: "*/15 * * * *", description: "Every 15 minutes", eventbridge: "*/15 * * * * *" },
    { unix: "0 0 1 * *", description: "First day of every month", eventbridge: "0 0 1 * * *" },
    { unix: "30 14 * * 0", description: "Every Sunday at 2:30 PM", eventbridge: "30 14 * * 7 *" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">
            Cron to EventBridge Converter
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Convert Unix cron expressions to AWS EventBridge compatible format
          </p>
        </div>

        {/* Main Converter */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Cron Expression Converter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <Label htmlFor="unix-cron" className="text-slate-200">
                Unix Cron Expression (5 fields)
              </Label>
              <Input
                id="unix-cron"
                value={unixCron}
                onChange={(e) => setUnixCron(e.target.value)}
                placeholder="0 9 * * 1"
                className={`bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-lg font-mono ${
                  !isValid ? "border-red-500" : ""
                }`}
              />
              <p className="text-sm text-slate-400">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Output Section */}
            <div className="space-y-2">
              <Label htmlFor="eventbridge-cron" className="text-slate-200">
                AWS EventBridge Cron Expression (6 fields)
              </Label>
              <div className="relative">
                <Input
                  id="eventbridge-cron"
                  value={eventBridgeCron}
                  readOnly
                  className="bg-slate-700 border-slate-600 text-white font-mono text-lg pr-12"
                  placeholder="Converted expression will appear here..."
                />
                {eventBridgeCron && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                    onClick={() => copyToClipboard(eventBridgeCron)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-slate-400">
                Format: minute hour day-of-month month day-of-week year
              </p>
            </div>

            {/* Error Display */}
            {!isValid && error && (
              <Alert className="bg-red-900/50 border-red-700">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Examples */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {examples.map((example, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors"
                  onClick={() => setUnixCron(example.unix)}
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-slate-200 font-medium">{example.description}</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
                        Unix: {example.unix}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
                        EventBridge: {example.eventbridge}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Differences */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Key Differences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-purple-300">Unix Cron</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• 5 fields: minute hour day month day-of-week</li>
                  <li>• Sunday = 0, Monday = 1, ..., Saturday = 6</li>
                  <li>• No year field</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-pink-300">EventBridge Cron</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• 6 fields: minute hour day month day-of-week year</li>
                  <li>• Sunday = 7, Monday = 1, ..., Saturday = 6</li>
                  <li>• Year field required (use * for any year)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-400 pb-8">
          <p>
            Built for AWS EventBridge • 
            <a 
              href="https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-purple-400 hover:text-purple-300 underline"
            >
              View Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
