import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateLeagueForm } from "./create-league-form";

export default function NewLeaguePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create a league</CardTitle>
          <CardDescription>
            Set up your league, pick your draft format, and invite friends once
            it&apos;s ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateLeagueForm />
        </CardContent>
      </Card>
    </div>
  );
}
