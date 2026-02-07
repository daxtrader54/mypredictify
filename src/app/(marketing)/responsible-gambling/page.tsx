import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Phone, Globe, Heart, Shield, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Responsible Gambling',
  description: 'MyPredictify is committed to promoting responsible gambling',
};

export default function ResponsibleGamblingPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-6">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Responsible Gambling</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Gambling should always be fun and never put you or anyone at risk.
            MyPredictify is committed to promoting responsible gambling practices.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
            <p className="text-muted-foreground leading-relaxed">
              MyPredictify provides predictions and analysis for informational and entertainment
              purposes. We are not a bookmaker or gambling operator. We do not accept bets or
              facilitate gambling transactions. However, we recognise that our tools may be used
              to inform betting decisions, and we take our responsibility seriously.
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">18+ Only</h3>
                <p className="text-sm text-muted-foreground">
                  Our Service is strictly for users aged 18 and over. You must be of legal
                  gambling age in your jurisdiction to use MyPredictify.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Heart className="h-8 w-8 text-red-500 mb-3" />
                <h3 className="font-semibold mb-2">Entertainment First</h3>
                <p className="text-sm text-muted-foreground">
                  Predictions are not guarantees. Treat betting as entertainment,
                  not as a source of income. Never bet more than you can afford to lose.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">Set Limits</h3>
                <p className="text-sm text-muted-foreground">
                  Set time and money limits before you start. Stick to them regardless
                  of whether you are winning or losing. Walk away when you reach your limit.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Globe className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold mb-2">Know the Law</h3>
                <p className="text-sm text-muted-foreground">
                  Gambling laws vary by jurisdiction. It is your responsibility to ensure
                  that online gambling is legal where you are located.
                </p>
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Signs of Problem Gambling</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you or someone you know shows any of the following signs, it may indicate
              a gambling problem:
            </p>
            <ul className="space-y-3">
              {[
                'Spending more money on gambling than you can afford',
                'Borrowing money or selling possessions to gamble',
                'Feeling anxious, worried, or irritable when trying to stop gambling',
                'Gambling to escape problems or relieve feelings of helplessness',
                'Chasing losses by continuing to gamble after losing',
                'Lying to family members or friends about gambling habits',
                'Neglecting work, education, or family responsibilities due to gambling',
                'Feeling the need to bet with increasing amounts for the same excitement',
              ].map((sign, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{sign}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Tips for Responsible Gambling</h2>
            <div className="space-y-3">
              {[
                { title: 'Set a budget', desc: 'Decide how much you can afford to lose before you start, and never exceed that amount.' },
                { title: 'Set time limits', desc: 'Decide how long you will gamble for and stick to it. Take regular breaks.' },
                { title: 'Don\'t chase losses', desc: 'Accept losses as part of gambling. Trying to win back money usually leads to bigger losses.' },
                { title: 'Don\'t gamble when emotional', desc: 'Avoid gambling when stressed, depressed, upset, or under the influence of alcohol.' },
                { title: 'Balance gambling with other activities', desc: 'Gambling should not be your only leisure activity. Maintain a healthy balance.' },
                { title: 'Understand the odds', desc: 'No prediction system is perfect. There is always risk involved, regardless of probability.' },
              ].map((tip, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="font-medium mb-1">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Where to Get Help</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you believe you have a gambling problem, please reach out to one of these
              organisations. They provide free, confidential support.
            </p>

            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">GamCare</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Free confidential advice, support, and counselling for problem gamblers in the UK.
                      </p>
                      <p className="text-sm mt-2">
                        Phone: <strong>0808 8020 133</strong> (free, 24/7)
                      </p>
                      <a href="https://www.gamcare.org.uk" className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        www.gamcare.org.uk
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Globe className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">BeGambleAware</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Free, confidential help and support for anyone affected by gambling.
                      </p>
                      <p className="text-sm mt-2">
                        Phone: <strong>0808 8020 133</strong>
                      </p>
                      <a href="https://www.begambleaware.org" className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        www.begambleaware.org
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Gamblers Anonymous</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        A fellowship of men and women who share their experience, strength,
                        and hope to solve their common problem.
                      </p>
                      <a href="https://www.gamblersanonymous.org.uk" className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        www.gamblersanonymous.org.uk
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">GAMSTOP</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Free self-exclusion scheme to restrict your online gambling activity
                        with all UKGC-licensed operators.
                      </p>
                      <a href="https://www.gamstop.co.uk" className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        www.gamstop.co.uk
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-12 p-6 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              If you feel that your gambling is becoming a problem, please stop and seek help immediately.
              There is no shame in asking for support — these services are free and confidential.
            </p>
          </section>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Questions? Contact us at{' '}
              <a href="mailto:support@mypredictify.com" className="text-primary hover:underline">
                support@mypredictify.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
