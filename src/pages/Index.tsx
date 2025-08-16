// Update this page (the content is just a fallback if you fail to update the page)

import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Plane, Package, Clock, Shield, Globe, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Plane className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Air Cargo
            <span className="text-primary"> Management</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Streamlined air cargo booking and tracking system. Book shipments, track in real-time, 
            and manage your logistics with enterprise-grade reliability.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/create-booking">Book Shipment</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/search">Track Cargo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Complete Cargo Management Solution
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage air cargo operations efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Package className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Easy Booking</CardTitle>
                <CardDescription>
                  Create bookings in seconds with our intuitive interface. 
                  Support for direct and transit routes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Track your cargo every step of the way with detailed timeline 
                  and status updates.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Route Optimization</CardTitle>
                <CardDescription>
                  Intelligent route search with direct and connecting flight options 
                  for optimal delivery times.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Enterprise-grade security with role-based access control 
                  and audit trails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Multi-user Support</CardTitle>
                <CardDescription>
                  Collaborate with team members and manage permissions 
                  for different user roles.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Plane className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Flight Integration</CardTitle>
                <CardDescription>
                  Seamless integration with flight schedules and real-time 
                  airline data for accurate tracking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to streamline your cargo operations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of logistics professionals using our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/search">Explore Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
