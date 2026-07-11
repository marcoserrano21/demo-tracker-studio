
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function ContactPage() {

  return (
    <div className="bg-background text-foreground min-h-screen">
       <div className="absolute top-4 left-4">
        <Button variant="outline" asChild>
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
            </Link>
        </Button>
      </div>
      <div className="container mx-auto px-4 py-12 md:py-24 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Get In Touch</h1>
            <p className="text-lg text-muted-foreground">
              Have questions or need support? Fill out the form, and a member of our team will get back to you.
            </p>
          </div>
          <Card className="mt-8 bg-card p-6 md:p-8 shadow-lg border-none rounded-2xl">
            <CardContent className="p-0">
              <form action="mailto:mhmjay15@gmail.com" method="POST" encType="text/plain" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="first-name" className="text-sm font-medium text-left block">
                      First Name
                    </Label>
                    <Input
                      type="text"
                      name="first-name"
                      id="first-name"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last-name" className="text-sm font-medium text-left block">
                      Last Name
                    </Label>
                    <Input
                      type="text"
                      name="last-name"
                      id="last-name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-left block">
                    Email
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-left block">
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    name="phone"
                    id="phone"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-left block">
                    Message
                  </Label>
                  <Textarea
                    name="message"
                    id="message"
                    rows={4}
                  />
                </div>
                <div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-on-hover">
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
