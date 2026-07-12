import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinLeagueForm } from "./join-league-form";

export default function JoinLeaguePage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Join a league</CardTitle>
          <CardDescription>
            Enter the invite code your commissioner shared with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinLeagueForm />
        </CardContent>
      </Card>
    </div>
  );
}
