'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { AdminChrome } from '../components/AdminChrome';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Service = {
  name: string;
};

type Customer = {
  full_name: string | null;
  phone: string | null;
};

type BusinessSettings = {
  logo_url: string | null;
};

type Row = {
  scheduled_at: string;
  status: string;
  quoted_price: number | null;
  amount_paid: number | null;
  services: Service | null;
  profiles: Customer | null;
};

type Walk = {
  visited_at: string;
  amount: number | null;
};

type ServiceSummary = {
  name: string;
  bookings: number;
  revenue: number;
};

type DailySummary = {
  count: number;
  revenue: number;
};

const money = (value: number) =>
  `K${value.toLocaleString('en-ZM', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const loadImageAsDataUrl = (
  url: string
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas =
        document.createElement('canvas');

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx =
        canvas.getContext('2d');

      if (!ctx) {
        reject(
          new Error(
            'Could not create canvas context'
          )
        );
        return;
      }

      ctx.drawImage(img, 0, 0);

      resolve(
        canvas.toDataURL('image/png')
      );
    };

    img.onerror = () => {
      reject(
        new Error(
          'Could not load business logo'
        )
      );
    };

    img.src = url;
  });

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [rows, setRows] = useState<Row[]>([]);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [business, setBusiness] =
  useState<BusinessSettings | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    const [
  bookingResult,
  walkResult,
  businessResult,
] = await Promise.all([
      supabase
        .from('bookings')
        .select(
          `
            scheduled_at,
            status,
            quoted_price,
            amount_paid,
            services(name),
            profiles!bookings_customer_id_fkey(
              full_name,
              phone
            )
          `
        )
        .gte('scheduled_at', `${from}T00:00:00`)
        .lte('scheduled_at', `${to}T23:59:59`)
        .order('scheduled_at'),

      supabase
        .from('walk_in_visits')
        .select('visited_at,amount')
        .gte('visited_at', `${from}T00:00:00`)
        .lte('visited_at', `${to}T23:59:59`)
        .order('visited_at'),

        supabase
  .from('business_settings')
  .select('logo_url')
  .limit(1)
  .maybeSingle(),
    ]);

    

    if (bookingResult.error) {
      setError(bookingResult.error.message);
      setLoading(false);
      return;
    }

    if (walkResult.error) {
      setError(walkResult.error.message);
      setLoading(false);
      return;
    }

    if (businessResult.error) {
  setError(
    businessResult.error.message
  );
  setLoading(false);
  return;
}

    setRows(
      (bookingResult.data as unknown as Row[]) ?? []
    );

    setWalks(
      (walkResult.data as Walk[]) ?? []
    );

    setBusiness(
  businessResult.data as BusinessSettings | null
);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const completed = useMemo(
    () =>
      rows.filter(
        row => row.status === 'completed'
      ),
    [rows]
  );

  const pending = useMemo(
    () =>
      rows.filter(row =>
        [
          'received',
          'confirmed',
          'in_progress',
        ].includes(row.status)
      ),
    [rows]
  );

  const cancelled = useMemo(
    () =>
      rows.filter(
        row => row.status === 'cancelled'
      ),
    [rows]
  );

  const rejected = useMemo(
    () =>
      rows.filter(
        row => row.status === 'rejected'
      ),
    [rows]
  );

  /*
   * Use actual amount_paid when available.
   * If amount_paid is empty, fall back to quoted_price.
   */
  const bookingAmount = (row: Row) =>
    Number(
      row.amount_paid ??
      row.quoted_price ??
      0
    );

  const appointmentRevenue = useMemo(
    () =>
      completed.reduce(
        (sum, row) =>
          sum + bookingAmount(row),
        0
      ),
    [completed]
  );

  const walkInRevenue = useMemo(
    () =>
      walks.reduce(
        (sum, walk) =>
          sum + Number(walk.amount || 0),
        0
      ),
    [walks]
  );

  const totalRevenue =
    appointmentRevenue + walkInRevenue;

  const totalTransactions =
    completed.length + walks.length;

  const averageTransaction =
    totalTransactions > 0
      ? totalRevenue / totalTransactions
      : 0;

  const completionRate =
    rows.length > 0
      ? (completed.length / rows.length) * 100
      : 0;

  const serviceSummary = useMemo(() => {
    const grouped: Record<
      string,
      ServiceSummary
    > = {};

    completed.forEach(row => {
      const name =
        row.services?.name ||
        'Unknown service';

      if (!grouped[name]) {
        grouped[name] = {
          name,
          bookings: 0,
          revenue: 0,
        };
      }

      grouped[name].bookings += 1;
      grouped[name].revenue +=
        bookingAmount(row);
    });

    return Object.values(grouped).sort(
      (a, b) => b.revenue - a.revenue
    );
  }, [completed]);

  const dailySummary = useMemo(() => {
    const grouped: Record<
      string,
      DailySummary
    > = {};

    completed.forEach(row => {
      const day =
        row.scheduled_at.slice(0, 10);

      if (!grouped[day]) {
        grouped[day] = {
          count: 0,
          revenue: 0,
        };
      }

      grouped[day].count += 1;
      grouped[day].revenue +=
        bookingAmount(row);
    });

    walks.forEach(walk => {
      const day =
        walk.visited_at.slice(0, 10);

      if (!grouped[day]) {
        grouped[day] = {
          count: 0,
          revenue: 0,
        };
      }

      grouped[day].count += 1;
      grouped[day].revenue +=
        Number(walk.amount || 0);
    });

    return Object.entries(grouped).sort(
      ([a], [b]) => a.localeCompare(b)
    );
  }, [completed, walks]);

    const generatePDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    const generatedAt = new Date().toLocaleString(
      'en-ZM'
    );

    // -----------------------------------------
// HEADER
// -----------------------------------------

let headerX = 14;

if (business?.logo_url) {
  try {
    const logoData =
      await loadImageAsDataUrl(
        business.logo_url
      );

    doc.addImage(
      logoData,
      'PNG',
      14,
      8,
      28,
      28
    );

    headerX = 50;
  } catch (logoError) {
    console.warn(
      'Could not load business logo for PDF:',
      logoError
    );
  }
}

doc.setFontSize(20);
doc.setFont('helvetica', 'bold');

doc.text(
  'SARJ BLENDED IT',
  headerX,
  17
);

doc.setFontSize(15);
doc.setFont('helvetica', 'normal');

doc.text(
  'Detailed Business Report',
  headerX,
  26
);

doc.setFontSize(9);
doc.setTextColor(100);

doc.text(
  `Reporting period: ${from} to ${to}`,
  headerX,
  33
);

doc.text(
  `Generated: ${generatedAt}`,
  pageWidth - 14,
  33,
  {
    align: 'right',
  }
);

doc.setTextColor(0);

    // -----------------------------------------
    // SUMMARY METRICS
    // -----------------------------------------

    autoTable(doc, {
  startY: 43,

      head: [[
        'Appointments',
        'Completed',
        'Walk-ins',
        'Total Revenue',
        'Avg. Transaction',
        'Completion Rate',
      ]],

      body: [[
        String(rows.length),
        String(completed.length),
        String(walks.length),
        money(totalRevenue),
        money(averageTransaction),
        `${completionRate.toFixed(1)}%`,
      ]],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 4,
      },

      headStyles: {
        fontStyle: 'bold',
      },
    });

    // -----------------------------------------
    // BUSINESS PERFORMANCE
    // -----------------------------------------

    const performanceY =
      (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Business Performance',
      14,
      performanceY
    );

    autoTable(doc, {
      startY: performanceY + 5,

      head: [[
        'Appointment Revenue',
        'Walk-in Revenue',
        'Total Revenue',
        'Average Transaction',
        'Completion Rate',
      ]],

      body: [[
        money(appointmentRevenue),
        money(walkInRevenue),
        money(totalRevenue),
        money(averageTransaction),
        `${completionRate.toFixed(1)}%`,
      ]],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
    });

    // -----------------------------------------
    // BOOKING STATUS
    // -----------------------------------------

    const statusY =
      (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Booking Status',
      14,
      statusY
    );

    autoTable(doc, {
      startY: statusY + 5,

      head: [[
        'Status',
        'Number of Bookings',
        'Revenue',
      ]],

      body: [
        [
          'Completed',
          String(completed.length),
          money(appointmentRevenue),
        ],
        [
          'Pending / Active',
          String(pending.length),
          '&mdash;',
        ],
        [
          'Cancelled',
          String(cancelled.length),
          '&mdash;',
        ],
        [
          'Rejected',
          String(rejected.length),
          '&mdash;',
        ],
      ],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
    });

    // -----------------------------------------
    // SERVICE PERFORMANCE
    // -----------------------------------------

    doc.addPage();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Service Performance',
      14,
      16
    );

    autoTable(doc, {
      startY: 22,

      head: [[
        'Service',
        'Completed Bookings',
        'Share',
        'Revenue',
      ]],

      body: serviceSummary.length
        ? serviceSummary.map(service => [
            service.name,
            String(service.bookings),
            completed.length > 0
              ? `${(
                  (service.bookings /
                    completed.length) *
                  100
                ).toFixed(1)}%`
              : '0.0%',
            money(service.revenue),
          ])
        : [[
            'No completed services',
            '0',
            '0%',
            money(0),
          ]],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
    });

    // -----------------------------------------
    // DAILY BREAKDOWN
    // -----------------------------------------

    const dailyY =
      (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Daily Breakdown',
      14,
      dailyY
    );

    autoTable(doc, {
      startY: dailyY + 5,

      head: [[
        'Date',
        'Transactions',
        'Revenue',
      ]],

      body: dailySummary.length
        ? dailySummary.map(([day, info]) => [
            formatDate(`${day}T12:00:00`),
            String(info.count),
            money(info.revenue),
          ])
        : [[
            'No activity',
            '0',
            money(0),
          ]],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
    });

    // -----------------------------------------
    // CUSTOMER / TRANSACTION DETAILS
    // -----------------------------------------

    doc.addPage();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'Customer & Transaction Details',
      14,
      16
    );

    const transactionRows = [
      ...rows.map(row => [
        formatDate(row.scheduled_at),
        row.profiles?.full_name ||
          'Unknown customer',
        row.profiles?.phone ||
          'No phone',
        row.services?.name ||
          'Unknown service',
        'Appointment',
        row.status.replace(/_/g, ' '),
        row.status === 'completed'
          ? money(bookingAmount(row))
          : money(
              Number(
                row.quoted_price || 0
              )
            ),
      ]),

      ...walks.map(walk => [
        formatDate(walk.visited_at),
        'Walk-in customer',
        '&mdash;',
        'Walk-in service',
        'Walk-in',
        'Paid',
        money(
          Number(walk.amount || 0)
        ),
      ]),
    ];

    autoTable(doc, {
      startY: 22,

      head: [[
        'Date',
        'Customer',
        'Phone',
        'Service',
        'Type',
        'Status',
        'Amount',
      ]],

      body: transactionRows.length
        ? transactionRows
        : [[
            '&mdash;',
            'No transactions',
            '&mdash;',
            '&mdash;',
            '&mdash;',
            '&mdash;',
            money(0),
          ]],

      theme: 'grid',

      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        overflow: 'linebreak',
      },

      headStyles: {
        fontStyle: 'bold',
      },

      columnStyles: {
        0: {
          cellWidth: 25,
        },
        1: {
          cellWidth: 38,
        },
        2: {
          cellWidth: 30,
        },
        3: {
          cellWidth: 38,
        },
        4: {
          cellWidth: 25,
        },
        5: {
          cellWidth: 25,
        },
        6: {
          cellWidth: 25,
          halign: 'right',
        },
      },
    });

    // -----------------------------------------
    // FOOTER ON EVERY PAGE
    // -----------------------------------------

    const pageCount =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= pageCount;
      page++
    ) {
      doc.setPage(page);

      const height =
        doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setTextColor(120);

      doc.text(
        `SARJ Blended IT &bull; Detailed Business Report &bull; Page ${page} of ${pageCount}`,
        pageWidth / 2,
        height - 8,
        {
          align: 'center',
        }
      );
    }

    // -----------------------------------------
    // DOWNLOAD
    // -----------------------------------------

    doc.save(
      `SARJ-Blended-IT-Report-${from}-to-${to}.pdf`
    );
  };

  return (
    <AdminChrome>
      <main className="reportPage">
        <section className="reportShell">

          <a
            className="forgot"
            href="/"
          >
            &larr; Dashboard
          </a>

          <p className="overline">
            OPERATIONS REPORTING
          </p>

          <h1>
            Detailed business report
          </h1>

          <p className="reportCopy">
            Detailed booking, customer, service,
            walk-in and revenue analysis for the
            selected reporting period.
          </p>

          {/* FILTERS */}

          <div className="reportFilter">

            <label>
              From

              <input
                type="date"
                value={from}
                onChange={e =>
                  setFrom(e.target.value)
                }
              />
            </label>

            <label>
              To

              <input
                type="date"
                value={to}
                onChange={e =>
                  setTo(e.target.value)
                }
              />
            </label>

            <button
              onClick={load}
              disabled={loading}
            >
              {loading
                ? 'Loading...'
                : 'Run report'}
            </button>

            <button
  type="button"
  onClick={generatePDF}
  disabled={loading}
>
  Generate PDF
</button>

          </div>

          {error && (
            <p className="notice">
              {error}
            </p>
          )}

          {/* TOP METRICS */}

          <section className="metrics">

            <article>
              <small>
                Total appointments
              </small>
              <strong>
                {rows.length}
              </strong>
            </article>

            <article>
              <small>
                Completed
              </small>
              <strong>
                {completed.length}
              </strong>
            </article>

            <article>
              <small>
                Walk-ins
              </small>
              <strong>
                {walks.length}
              </strong>
            </article>

            <article>
              <small>
                Total revenue
              </small>
              <strong>
                {money(totalRevenue)}
              </strong>
            </article>

          </section>

          {/* BUSINESS PERFORMANCE */}

          <section className="panel">

            <div className="panelHead">

              <div>

                <p className="overline">
                  PERFORMANCE
                </p>

                <h2>
                  Business performance
                </h2>

              </div>

              <span>
                {from} &rarr; {to}
              </span>

            </div>

            <div className="metrics">

              <article>
                <small>
                  Appointment revenue
                </small>
                <strong>
                  {money(appointmentRevenue)}
                </strong>
              </article>

              <article>
                <small>
                  Walk-in revenue
                </small>
                <strong>
                  {money(walkInRevenue)}
                </strong>
              </article>

              <article>
                <small>
                  Average transaction
                </small>
                <strong>
                  {money(averageTransaction)}
                </strong>
              </article>

              <article>
                <small>
                  Completion rate
                </small>
                <strong>
                  {completionRate.toFixed(1)}%
                </strong>
              </article>

            </div>

          </section>

          {/* BOOKING STATUS */}

          <section className="panel">

            <div className="panelHead">

              <div>

                <p className="overline">
                  BOOKINGS
                </p>

                <h2>
                  Booking status
                </h2>

              </div>

            </div>

            <div className="table">

              <div className="row">
                <b>Completed</b>
                <span>
                  {completed.length}
                </span>
                <strong>
                  {money(appointmentRevenue)}
                </strong>
              </div>

              <div className="row">
                <b>Pending / active</b>
                <span>
                  {pending.length}
                </span>
                <strong>
                  &mdash;
                </strong>
              </div>

              <div className="row">
                <b>Cancelled</b>
                <span>
                  {cancelled.length}
                </span>
                <strong>
                  &mdash;
                </strong>
              </div>

              <div className="row">
                <b>Rejected</b>
                <span>
                  {rejected.length}
                </span>
                <strong>
                  &mdash;
                </strong>
              </div>

            </div>

          </section>

          {/* SERVICE PERFORMANCE */}

          <section className="panel">

            <div className="panelHead">

              <div>

                <p className="overline">
                  SERVICES
                </p>

                <h2>
                  Service performance
                </h2>

              </div>

            </div>

            {serviceSummary.length ? (

              <div className="table">

                {serviceSummary.map(
                  service => (

                    <div
                      className="row"
                      key={service.name}
                    >

                      <div>

                        <b>
                          {service.name}
                        </b>

                        <p>
                          {service.bookings}{' '}
                          completed booking
                          {service.bookings === 1
                            ? ''
                            : 's'}
                        </p>

                      </div>

                      <span>
                        {completed.length > 0
                          ? (
                              (service.bookings /
                                completed.length) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </span>

                      <strong>
                        {money(
                          service.revenue
                        )}
                      </strong>

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="empty">
                No completed services in this period.
              </p>

            )}

          </section>

          {/* DAILY ACTIVITY */}

          <section className="panel">

            <div className="panelHead">

              <div>

                <p className="overline">
                  DAILY ACTIVITY
                </p>

                <h2>
                  Daily breakdown
                </h2>

              </div>

            </div>

            {dailySummary.length ? (

              <div className="table">

                {dailySummary.map(
                  ([day, info]) => (

                    <div
                      className="row"
                      key={day}
                    >

                      <div>

                        <b>
                          {new Date(
                            `${day}T12:00:00`
                          ).toLocaleDateString(
                            'en-ZM',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </b>

                        <p>
                          {info.count}{' '}
                          transaction
                          {info.count === 1
                            ? ''
                            : 's'}
                        </p>

                      </div>

                      <strong>
                        {money(
                          info.revenue
                        )}
                      </strong>

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="empty">
                No recorded activity in this period.
              </p>

            )}

          </section>

          {/* ==================================================
              DETAILED CUSTOMER / SERVICE TRANSACTIONS
             ================================================== */}

          <section className="panel reportTransactions">

            <div className="panelHead">

              <div>

                <p className="overline">
                  TRANSACTION DETAILS
                </p>

                <h2>
                  Customers, services & amounts
                </h2>

              </div>

              <span>
                {rows.length + walks.length}{' '}
                records
              </span>

            </div>

            {rows.length || walks.length ? (

              <div className="reportDetailTable">

                {/* HEADER */}

                <div className="reportDetailRow reportDetailHeader">

                  <span>
                    Date & time
                  </span>

                  <span>
                    Customer
                  </span>

                  <span>
                    Service
                  </span>

                  <span>
                    Type
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Amount
                  </span>

                </div>

                {/* APPOINTMENTS */}

                {rows.map(
                  (row, index) => (

                    <div
                      className="reportDetailRow"
                      key={`booking-${index}`}
                    >

                      <div>
                        <strong>
                          {formatDate(
                            row.scheduled_at
                          )}
                        </strong>

                        <small>
                          {formatDateTime(
                            row.scheduled_at
                          )
                          
                            .split(',')
                            .slice(1)
                            .join(',')
                            .trim()}
                        </small>
                      </div>

                      

                      <div>
                        <strong>
                          {row.profiles
                            ?.full_name ||
                            'Unknown customer'}
                        </strong>

                        <small>
                          {row.profiles
                            ?.phone ||
                            'No phone recorded'}
                        </small>
                      </div>

                      <div>
                        <strong>
                          {row.services
                            ?.name ||
                            'Unknown service'}
                        </strong>
                      </div>

                      <div>
                        Appointment
                      </div>

                      <div>
                        <span
                          className={`reportStatus reportStatus-${row.status}`}
                        >
                          {row.status
                            .replace(
                              /_/g,
                              ' '
                            )}
                        </span>
                      </div>

                      <strong>
                        {row.status ===
                        'completed'
                          ? money(
                              bookingAmount(
                                row
                              )
                            )
                          : money(
                              Number(
                                row.quoted_price ||
                                  0
                              )
                            )}
                      </strong>

                    </div>

                  )
                )}

                {/* WALK-INS */}

                {walks.map(
                  (walk, index) => (

                    <div
                      className="reportDetailRow"
                      key={`walk-${index}`}
                    >

                      <div>
                        <strong>
                          {formatDate(
                            walk.visited_at
                          )}
                        </strong>

                        <small>
                          {formatDateTime(
                            walk.visited_at
                          )
                            .split(',')
                            .slice(1)
                            .join(',')
                            .trim()}
                        </small>
                      </div>

                      <div>
                        <strong>
                          Walk-in customer
                        </strong>

                        <small>
                          Customer details
                          recorded at visit
                        </small>
                      </div>

                      <div>
                        <strong>
                          Walk-in service
                        </strong>
                      </div>

                      <div>
                        Walk-in
                      </div>

                      <div>
                        <span className="reportStatus reportStatus-completed">
                          paid
                        </span>
                      </div>

                      <strong>
                        {money(
                          Number(
                            walk.amount || 0
                          )
                        )}
                      </strong>

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="empty">
                No transactions were recorded
                in this date range.
              </p>

            )}

          </section>

          {/* REPORT SUMMARY */}

          <section className="panel">

            <div className="panelHead">

              <div>

                <p className="overline">
                  REPORT SUMMARY
                </p>

                <h2>
                  Reporting period
                </h2>

              </div>

            </div>

            <p className="reportCopy">

              This report covers{' '}
              <strong>{from}</strong>{' '}
              through{' '}
              <strong>{to}</strong>.

              Revenue includes completed
              appointments and recorded
              walk-in payments.

            </p>

            <p className="reportCopy">

              Generated{' '}
              {new Date().toLocaleString()}

            </p>

          </section>

        </section>
      </main>
    </AdminChrome>
  );
}