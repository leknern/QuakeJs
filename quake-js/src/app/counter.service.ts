import { asInjectable } from "../lib/injectable";

export class CounterService {

}
asInjectable({ scoped: true }, CounterService)