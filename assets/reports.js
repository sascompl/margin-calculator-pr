jQuery(document).ready(function ($) {
	var reportData = null
	var reportCurrency = ''
	var currentSort = { key: null, dir: 'desc' }

	function decodeHtml(html) {
		var txt = document.createElement('textarea')
		txt.innerHTML = html
		return txt.value
	}

	function formatMoney(amount, symbol) {
		var formatted = parseFloat(amount)
			.toFixed(2)
			.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
		return formatted + ' ' + decodeHtml(symbol)
	}

	function renderRows(orders, sym) {
		var $tbody = $('#mcpro-report-tbody').empty()

		$.each(orders, function (i, row) {
			var marginCell, profitCell

			if (row.margin === null) {
				marginCell = '<td style="color:#999;">&#8212;</td>'
				profitCell = '<td style="color:#999;">&#8212;</td>'
			} else {
				var marginColor =
					row.margin >= 30
						? '#4CAF50'
						: row.margin >= 15
							? '#FB8C00'
							: '#C62828'
				var profitColor = row.profit >= 0 ? '#4CAF50' : '#C62828'
				marginCell =
					'<td style="color:' +
					marginColor +
					';font-weight:700;font-size:14px;">' +
					row.margin +
					'%</td>'
				profitCell =
					'<td style="color:' +
					profitColor +
					';font-weight:600;">' +
					formatMoney(row.profit, sym) +
					'</td>'
			}

			$tbody.append(
				'<tr>' +
					'<td><a href="' +
					row.edit_url +
					'">#' +
					row.order_number +
					'</a></td>' +
					'<td>' +
					row.date +
					'</td>' +
					'<td>' +
					$('<span>').text(row.customer).html() +
					'</td>' +
					'<td>' +
					formatMoney(row.revenue, sym) +
					'</td>' +
					'<td>' +
					(row.cost > 0
						? formatMoney(row.cost, sym)
						: '<span style="color:#999;">&#8212;</span>') +
					'</td>' +
					profitCell +
					marginCell +
					'</tr>'
			)
		})
	}

	function sortOrders(key) {
		if (!reportData) return

		if (currentSort.key === key) {
			currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc'
		} else {
			currentSort.key = key
			currentSort.dir = 'desc'
		}

		reportData.sort(function (a, b) {
			var valA = a[key] === null ? -Infinity : a[key]
			var valB = b[key] === null ? -Infinity : b[key]
			return currentSort.dir === 'desc' ? valB - valA : valA - valB
		})

		// Update sort indicators
		$('.mcpro-sortable').removeClass('mcpro-sort-asc mcpro-sort-desc')
		$('.mcpro-sortable[data-sort="' + key + '"]').addClass(
			currentSort.dir === 'desc' ? 'mcpro-sort-desc' : 'mcpro-sort-asc'
		)

		renderRows(reportData, reportCurrency)
	}

	function loadReport(dateFrom, dateTo) {
		$('#mcpro-report-results').hide()
		$('#mcpro-report-empty').hide()
		$('#mcpro-report-loading').show()
		reportData = null
		currentSort = { key: null, dir: 'desc' }
		$('.mcpro-sortable').removeClass('mcpro-sort-asc mcpro-sort-desc')

		$.ajax({
			url: mcpro.ajax_url,
			type: 'POST',
			data: {
				action: 'mcpro_get_report',
				nonce: mcpro.nonce,
				date_from: dateFrom,
				date_to: dateTo,
			},
			success: function (response) {
				$('#mcpro-report-loading').hide()

				if (!response.success) {
					$('#mcpro-report-empty')
						.text(response.data || 'Error loading report.')
						.show()
					return
				}

				if (response.data.total_orders === 0) {
					$('#mcpro-report-empty').show()
					return
				}

				var d = response.data
				var sym = d.currency

				reportData = d.orders
				reportCurrency = sym

				$('#mcpro-total-orders').text(d.total_orders)
				$('#mcpro-total-revenue').text(formatMoney(d.total_revenue, sym))
				$('#mcpro-total-cost').text(formatMoney(d.total_cost, sym))

				var $profit = $('#mcpro-total-profit')
				$profit
					.text(formatMoney(d.total_profit, sym))
					.removeClass('positive negative')
					.addClass(d.total_profit >= 0 ? 'positive' : 'negative')

				var $margin = $('#mcpro-avg-margin')
				$margin
					.text(d.avg_margin + '%')
					.removeClass('positive negative')
					.addClass(d.avg_margin >= 0 ? 'positive' : 'negative')

				renderRows(reportData, sym)
				$('#mcpro-report-results').show()
			},
			error: function (xhr, status, error) {
				$('#mcpro-report-loading').hide()
				$('#mcpro-report-empty')
					.text('Error: ' + (error || 'Connection failed'))
					.show()
			},
		})
	}

	// Sort on header click
	$(document).on('click', '.mcpro-sortable', function () {
		sortOrders($(this).data('sort'))
	})

	function getMonthRange(year, month) {
		var from = year + '-' + String(month).padStart(2, '0') + '-01'
		var lastDay = new Date(year, month, 0).getDate()
		var to =
			year +
			'-' +
			String(month).padStart(2, '0') +
			'-' +
			String(lastDay).padStart(2, '0')
		return { from: from, to: to }
	}

	// Quick filter: current month
	$('.mcpro-quick-filter[data-filter="current_month"]').on('click', function () {
		$('.mcpro-quick-filter').removeClass('active')
		$(this).addClass('active')

		var now = new Date()
		var range = getMonthRange(now.getFullYear(), now.getMonth() + 1)

		$('#mcpro-date-from').val(range.from)
		$('#mcpro-date-to').val(range.to)
		$('#mcpro-month').val(now.getMonth() + 1)
		$('#mcpro-year').val(now.getFullYear())

		loadReport(range.from, range.to)
	})

	// Quick filter: previous month
	$('.mcpro-quick-filter[data-filter="previous_month"]').on('click', function () {
		$('.mcpro-quick-filter').removeClass('active')
		$(this).addClass('active')

		var now = new Date()
		var prevMonth = now.getMonth() // 0-based = previous month
		var prevYear = now.getFullYear()
		if (prevMonth === 0) {
			prevMonth = 12
			prevYear--
		}

		var range = getMonthRange(prevYear, prevMonth)

		$('#mcpro-date-from').val(range.from)
		$('#mcpro-date-to').val(range.to)
		$('#mcpro-month').val(prevMonth)
		$('#mcpro-year').val(prevYear)

		loadReport(range.from, range.to)
	})

	// Apply month + year
	$('#mcpro-apply-month').on('click', function () {
		$('.mcpro-quick-filter').removeClass('active')

		var month = parseInt($('#mcpro-month').val())
		var year = parseInt($('#mcpro-year').val())
		var range = getMonthRange(year, month)

		$('#mcpro-date-from').val(range.from)
		$('#mcpro-date-to').val(range.to)

		loadReport(range.from, range.to)
	})

	// Apply custom date range
	$('#mcpro-apply-range').on('click', function () {
		$('.mcpro-quick-filter').removeClass('active')

		var from = $('#mcpro-date-from').val()
		var to = $('#mcpro-date-to').val()

		if (!from || !to) {
			alert('Please select both dates.')
			return
		}

		if (from > to) {
			alert('Start date must be before end date.')
			return
		}

		loadReport(from, to)
	})

	// Auto-load current month on page load
	$('.mcpro-quick-filter[data-filter="current_month"]').trigger('click')
})
