
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  FileText,
  Truck,
  Undo2,
  Ban,
  Shield,
  Phone,
  Mail,
  Building,
  Wrench,
} from 'lucide-react';
import { useAuth, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { User as UserType } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';

// Schemas for form validation
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().default(false),
});

const signupSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Invalid email address.' }),
    phone: z
      .string()
      .min(10, { message: 'Enter a valid 10-digit phone number.' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

function AuthForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleUserDoc = async (user: any, additionalData?: Partial<UserType>) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || additionalData?.name,
        phone: user.phoneNumber || additionalData?.phone || '',
        role: 'customer', // Default role
        createdAt: serverTimestamp(),
        ...additionalData,
      });
    }
    // If doc exists, do nothing to preserve role and other data.
  };

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);
    if (!auth) return setLoading(false);
    try {
      await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      toast({ title: "Successfully logged in!" });
      router.push('/');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid email or password.' });
    } finally {
      setLoading(false);
    }
  };

  const onSignupSubmit = async (data: z.infer<typeof signupSchema>) => {
    setLoading(true);
    if (!auth) return setLoading(false);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;
      await handleUserDoc(user, { name: data.name, phone: data.phone });
      toast({ title: "Successfully signed up!" });
      router.push('/');
    } catch (err: any) {
      let message = err.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' : err.message;
      toast({ variant: 'destructive', title: 'Sign-up Failed', description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    if (!auth) return setLoading(false);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleUserDoc(userCredential.user);
      toast({ title: "Successfully signed in with Google!" });
      router.push('/');
    } catch (err: any) {
       toast({ variant: 'destructive', title: 'Google Sign-in Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (
    data: z.infer<typeof forgotPasswordSchema>
  ) => {
    setLoading(true);
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized.' });
      setLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for a link to reset your password.',
      });
      setShowForgotPassword(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          err.code === 'auth/user-not-found'
            ? 'No account found with this email.'
            : err.message,
      });
    } finally {
      setLoading(false);
    }
  };
  
    const GoogleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.108-11.283-7.443l-6.571,4.819C9.656,39.663,16.318,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.242,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );

  return (
    <div className="flex w-full items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Welcome Back!</CardTitle>
                <CardDescription>
                  Sign in to access your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                Remember me
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Login
                    </Button>
                  </form>
                </Form>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>
                  Join us and start shopping today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signupForm}>
                  <form
                    onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your phone number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I agree to the{' '}
                              <Link
                                href="/policies/terms"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                Terms & Conditions
                              </Link>{' '}
                              and{' '}
                              <Link
                                href="/policies/privacy"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                Privacy Policy
                              </Link>
                              .
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        >
          <AlertDialogContent>
            <Form {...forgotPasswordForm}>
              <form
                onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>Forgot Your Password?</AlertDialogTitle>
                  <AlertDialogDescription>
                    No problem. Enter your email address below and we&apos;ll send
                    you a link to reset it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button type="submit" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Reset Link
                  </Button>
                </AlertDialogFooter>
              </form>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

const InfoRow = ({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) => (
  <Link href={href}>
    <Card className="mb-2 transition-shadow duration-300 hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
);


function LoggedInAccountView() {
  const { user, userDoc } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({
      title: 'Logged Out',
      description: "You've been successfully signed out.",
    });
    router.push('/');
  };

  const policyItems = [
    { icon: FileText, label: 'Terms & Conditions', href: '/policies/terms' },
    { icon: ShieldCheck, label: 'Privacy Policy', href: '/policies/privacy' },
    { icon: Truck, label: 'Shipping Policy', href: '/policies/shipping' },
    { icon: Undo2, label: 'Return Policy', href: '/policies/return' },
    { icon: Ban, label: 'Cancellation Policy', href: '/policies/cancellation' },
    { icon: Shield, label: 'Warranty Policy', href: '/policies/warranty' },
    { icon: Phone, label: 'Contact Us', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        
        <Card className="mb-4 overflow-hidden rounded-xl shadow-sm">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="mb-4 h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-primary">
                <UserIcon size={40} />
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold font-headline">Welcome to Lapking Hub</h1>
            <p className="text-muted-foreground">Your B2B Laptop Parts Store</p>
            {userDoc && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>{userDoc.name}</p>
                <p>{userDoc.email}</p>
                <p className="capitalize font-semibold mt-1 text-primary">{userDoc.role}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {userDoc?.role === 'admin' && (
           <Link href="/admin">
            <Card className="mb-4 bg-primary text-primary-foreground transition-shadow duration-300 hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <Wrench className="h-5 w-5" />
                        <span className="font-semibold">Admin Dashboard</span>
                    </div>
                     <p className="hidden text-sm md:block">Manage Products, Categories, Orders →</p>
                </CardContent>
            </Card>
           </Link>
        )}

        <div className="mb-4">
          {policyItems.map((item) => (
            <InfoRow key={item.label} {...item} />
          ))}
        </div>

        <Card className="mb-4 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
             <div className="flex items-center gap-4">
                <Phone className="h-5 w-5 text-muted-foreground"/>
                <span className="text-muted-foreground">+91 12345 67890</span>
             </div>
              <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-muted-foreground"/>
                <span className="text-muted-foreground">support@lapking.com</span>
             </div>
              <div className="flex items-start gap-4">
                <Building className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground"/>
                <span className="text-muted-foreground">123 Tech Hub, Silicon Valley, Mumbai, Maharashtra 400001</span>
             </div>
          </CardContent>
        </Card>
        
        <Button variant="ghost" onClick={handleLogout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}


export default function AccountPage() {
  const { user, isUserLoading, isUserDocLoading } = useUser();

  if (isUserLoading || isUserDocLoading) {
    return (
      <div className="container mx-auto flex h-[calc(100vh-10rem)] items-center justify-center px-4 py-8">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <LoggedInAccountView />;
}
