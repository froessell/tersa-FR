import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const title = 'Thank you for signing up!';
const description = 'Welcome to Tersa';

export const metadata = {
  title,
  description,
};

const SignUpSuccessPage = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground text-sm">
        You&apos;ve successfully signed up and can now sign in to your account.
      </p>
    </CardContent>
  </Card>
);

export default SignUpSuccessPage;
