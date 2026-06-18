import { Route, Switch } from 'wouter'
import { Header } from '@/components/Header'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import CalculatorAVD from '@/pages/CalculatorAVD'
import CalculatorComparison from '@/pages/CalculatorComparison'
import CalculatorEarlyStart from '@/pages/CalculatorEarlyStart'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Header />
      <main className="flex-1 pt-16">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/rechner/avd" component={CalculatorAVD} />
          <Route path="/rechner/vergleich" component={CalculatorComparison} />
          <Route path="/rechner/fruehstart" component={CalculatorEarlyStart} />
        </Switch>
      </main>
      <Footer />
    </div>
  )
}
