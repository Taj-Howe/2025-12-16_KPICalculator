## Wireframes (low-fidelity)

  
```
### 1) KPI Input Form

  

+------------------------------------------------------+

| Business KPI Calculator                               |
|------------------------------------------------------|
| Period:   ( Monthly v )                               |
| Model:    ( Subscription v )                          |
|------------------------------------------------------|
| Inputs (all per selected period)                      |
|                                                      |
| Revenue / Period:           [__________]              |
| Gross Margin (0-1):         [____]   (e.g. 0.70)      |
| Marketing Spend / Period:   [__________]              |
| New Customers / Period:     [__________]              |
| Active Customers (Start):   [__________]              |
| Active Customers (End):     [__________]              |
|                                                      |
| [ Subscription-only ]                                 |
| Churned Customers / Period: [__________]              |
|                                                      |
| [ Transactional-only ]                                |
| Retention Rate / Period:    [____] (0-1)              |
|                                                      |
|------------------------------------------------------|

| [ Calculate ]   [ Save Report ]                       |

+------------------------------------------------------+

  

Notes:

- Hide irrelevant inputs based on Model, but keep the “all per period” banner visible.

- Save button enabled after a successful calculation (or save inputs + results together).

  

---

  

### 2) KPI Dashboard (Results)

  

+------------------------------------------------------+
| KPI Dashboard                                         |
| Period: Monthly | Model: Subscription                 |
| Report: (Untitled)  [ Save as... ]                    |
|------------------------------------------------------|
| Warnings                                                |
| - Churn rate is very low; LTV may be inflated         |

|------------------------------------------------------|
| Core KPIs                                             |
| CAC:                 $_____                           |
| LTGP:                $_____                           |
| LTGP:CAC:            ____x                            |
| Growth Assessment:   ____x (same as LTGP:CAC)         |
| LTV:                 $_____                           |
| Churn Rate:          ____%                            |
| ARPC:                $_____ / customer / period       |
| CAR:                 ____ customers per period        |
|------------------------------------------------------|
| Hypotheticals (annualized)                            |
| Max Revenue / Year:  $_____                           |
| Max Profit / Year:   $_____                           |
|------------------------------------------------------|
| [ Back to Inputs ]   [ View Saved Reports ]           |

+------------------------------------------------------+

  


---

  

### 3) Saved Reports (List + Detail)

  

+------------------------------------------------------+

| Saved Reports                                         |
|------------------------------------------------------|
| [Search____]  [Period filter v]  [Model filter v]     |
|------------------------------------------------------|
| 2025-12-16 | Monthly | Subscription | "Baseline"      |
| 2025-12-01 | Monthly | Subscription | "After price"   |
| 2025-11-15 | Quarterly | Transactional | "Holiday"    |
|------------------------------------------------------|
| Select a report to view                               |
+------------------------------------------------------+

```
