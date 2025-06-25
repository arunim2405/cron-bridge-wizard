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
        throw new Error("Unix cron must have exactly 5 fields: minute hour day-of-month month day-of-week");
      }

      let [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // Handle day-of-week conversion (Unix: 0=Sunday, EventBridge: 1=Sunday, 7=Sunday)
      if (dayOfWeek !== "*") {
        // Handle named days (MON, TUE, etc.) - EventBridge supports these
        if (!/^\d/.test(dayOfWeek) && dayOfWeek.includes("MON")) {
          // Keep named days as-is for EventBridge
          dayOfWeek = dayOfWeek.replace(/SUN/g, "1")
                               .replace(/MON/g, "2")
                               .replace(/TUE/g, "3")
                               .replace(/WED/g, "4")
                               .replace(/THU/g, "5")
                               .replace(/FRI/g, "6")
                               .replace(/SAT/g, "7");
        } else {
          // Convert individual numbers, ranges, and lists
          dayOfWeek = dayOfWeek.replace(/\b0\b/g, "1"); // Sunday: 0 -> 1
          
          // Handle ranges like 1-5 (Mon-Fri in Unix becomes 2-6 in EventBridge)
          dayOfWeek = dayOfWeek.replace(/(\d)-(\d)/g, (match, start, end) => {
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            
            // Convert range bounds (Unix 1-6 becomes EventBridge 2-7)
            const newStart = startNum === 0 ? 1 : startNum + 1;
            const newEnd = endNum === 0 ? 1 : endNum + 1;
            
            return `${newStart}-${newEnd}`;
          });
          
          // Handle comma-separated lists like 1,3,5 (convert each number)
          dayOfWeek = dayOfWeek.replace(/\b([1-6])\b/g, (match, num) => {
            return String(parseInt(num) + 1);
          });
        }
      }

      // Handle mutual exclusivity of day-of-month and day-of-week in EventBridge
      if (dayOfMonth !== "*" && dayOfWeek !== "*") {
        // If both are specified, EventBridge requires one to be "?"
        // We'll prioritize day-of-month and set day-of-week to "?"
        dayOfWeek = "?";
      } else if (dayOfMonth === "*" && dayOfWeek === "*") {
        // If both are wildcards, keep day-of-month as "*" and set day-of-week to "?"
        dayOfWeek = "?";
      } else if (dayOfMonth === "*" && dayOfWeek !== "*") {
        // If day-of-month is wildcard and day-of-week is specific, set day-of-month to "?"
        dayOfMonth = "?";
      }

      // EventBridge format: minute hour day-of-month month day-of-week year
      const eventBridgeExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek} *`;
      
      return eventBridgeExpression;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Invalid cron expression");
    }
  };

  const validateCronExpression = (cronExpression: string) => {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    
    // Enhanced validation for each field
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Minute: 0-59
    if (!isValidCronField(minute, 0, 59)) return false;
    
    // Hour: 0-23
    if (!isValidCronField(hour, 0, 23)) return false;
    
    // Day of month: 1-31
    if (!isValidCronField(dayOfMonth, 1, 31)) return false;
    
    // Month: 1-12
    if (!isValidCronField(month, 1, 12)) return false;
    
    // Day of week: 0-7 (0 and 7 are Sunday)
    if (!isValidCronField(dayOfWeek, 0, 7)) return false;
    
    return true;
  };

  const isValidCronField = (field: string, min: number, max: number): boolean => {
    // Allow wildcards
    if (field === "*") return true;
    
    // Allow named days
    if (field.match(/^(SUN|MON|TUE|WED|THU|FRI|SAT)(-|,)*(SUN|MON|TUE|WED|THU|FRI|SAT)*$/)) return true;
    
    // Allow step values like */5 or 0/15
    if (field.includes("/")) {
      const [range, step] = field.split("/");
      if (range === "*") return !isNaN(parseInt(step)) && parseInt(step) > 0;
      
      // Handle ranges with steps like 1-10/2
      if (range.includes("-")) {
        const [start, end] = range.split("-").map(n => parseInt(n));
        return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
      }
      
      // Handle single number with step like 0/15
      const rangeNum = parseInt(range);
      return !isNaN(rangeNum) && rangeNum >= min && rangeNum <= max;
    }
    
    // Allow ranges like 1-5
    if (field.includes("-")) {
      const [start, end] = field.split("-").map(n => parseInt(n));
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    
    // Allow comma-separated lists like 1,3,5
    if (field.includes(",")) {
      const values = field.split(",").map(n => parseInt(n.trim()));
      return values.every(val => !isNaN(val) && val >= min && val <= max);
    }
    
    // Single number
    const num = parseInt(field);
    return !isNaN(num) && num >= min && num <= max;
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
        throw new Error("Invalid cron expression format. Please check field values and ranges.");
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
    { 
      unix: "15 12 * * *", 
      description: "Run at 12:15 PM every day", 
      eventbridge: "15 12 * * ? *" 
    },
    { 
      unix: "0 18 * * 1-5", 
      description: "Run at 6:00 PM Monday through Friday", 
      eventbridge: "0 18 ? * 2-6 *" 
    },
    { 
      unix: "0 8 1 * *", 
      description: "Run at 8:00 AM on 1st day of month", 
      eventbridge: "0 8 1 * ? *" 
    },
    { 
      unix: "0/15 * * * *", 
      description: "Run every 15 minutes", 
      eventbridge: "0/15 * * * ? *" 
    },
    { 
      unix: "0/10 * * * 1-5", 
      description: "Run every 10 minutes Monday through Friday", 
      eventbridge: "0/10 * ? * 2-6 *" 
    },
    { 
      unix: "0/5 8-17 * * 1-5", 
      description: "Run every 5 minutes, 8 AM to 5:55 PM, Monday-Friday", 
      eventbridge: "0/5 8-17 ? * 2-6 *" 
    },
    { 
      unix: "0/30 20-2 * * 1-5", 
      description: "Run every 30 minutes, 8 PM to 2:30 AM, Monday-Friday", 
      eventbridge: "0/30 20-2 ? * 2-6 *" 
    },
    { 
      unix: "0 9 * * 1", 
      description: "Every Monday at 9:00 AM", 
      eventbridge: "0 9 ? * 2 *" 
    },
    { 
      unix: "30 14 * * 0", 
      description: "Every Sunday at 2:30 PM", 
      eventbridge: "30 14 ? * 1 *" 
    },
    { 
      unix: "0 8 * * 1,3,5", 
      description: "Monday, Wednesday, Friday at 8:00 AM", 
      eventbridge: "0 8 ? * 2,4,6 *" 
    }
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
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-purple-300">Unix Cron</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• 5 fields: minute hour day-of-month month day-of-week</li>
                  <li>• Sunday = 0, Monday = 1, ..., Saturday = 6</li>
                  <li>• No year field</li>
                  <li>• Uses system's local timezone</li>
                  <li>• Allows '*' in all fields</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-pink-300">EventBridge Cron</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• 6 fields: minute hour day-of-month month day-of-week year</li>
                  <li>• Sunday = 1, Monday = 2, ..., Saturday = 7</li>
                  <li>• Year field required (use * for any year)</li>
                  <li>• Always runs in UTC timezone</li>
                  <li>• Uses '?' for "no specific value" in day fields</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-md font-semibold text-yellow-300 mb-2">Important Notes</h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li>• EventBridge requires '?' in either day-of-month OR day-of-week when the other is specified</li>
                <li>• Day-of-week conversion: Unix 0→1, 1→2, 2→3, 3→4, 4→5, 5→6, 6→7</li>
                <li>• EventBridge schedules are always in UTC - adjust your times accordingly</li>
                <li>• The converter automatically handles mutual exclusivity rules</li>
              </ul>
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
