jQuery(document).ready(function ($) {
	// Quick Edit - załaduj cenę zakupu przy otwieraniu
	var $wpInlineEdit = inlineEditPost.edit

	inlineEditPost.edit = function (id) {
		$wpInlineEdit.apply(this, arguments)

		var postId = 0
		if (typeof id == 'object') {
			postId = parseInt(this.getId(id))
		}

		if (postId > 0) {
			// Wyczyść pole najpierw
			$('input[name="_purchase_price_net"]').val('')

			// Pobierz cenę zakupu przez AJAX
			$.ajax({
				url: mcpro.ajax_url,
				type: 'POST',
				data: {
					action: 'mcpro_get_purchase_price',
					product_id: postId,
					nonce: mcpro.nonce,
				},
				success: function (response) {
					if (response.success && response.data.purchase_price) {
						// Wstaw wartość do pola
						var $field = $('input[name="_purchase_price_net"]')
						$field.val(response.data.purchase_price)

						// Dodaj visual feedback
						$field.css('background-color', '#ffffcc')
						setTimeout(function () {
							$field.css('background-color', '')
						}, 500)
					}
				},
				error: function () {
					console.log('MCPRO: Error loading purchase price')
				},
			})
		}
	}

	// Podświetl wiersz przy zapisie Quick Edit
	$(document).on('click', '.inline-edit-save .button-primary', function () {
		var $row = $(this).closest('tr')
		setTimeout(function () {
			if ($row.effect) {
				$row.effect('highlight', {}, 1000)
			}
		}, 500)
	})

	// TOGGLE VARIATIONS LIST (rozwijana lista wariantów)
	$(document).on('click', '.mcpro-toggle-variations', function (e) {
		e.preventDefault()
		var targetId = $(this).data('target')
		var $list = $('#' + targetId)
		var $icon = $(this).find('.dashicons')

		$list.slideToggle(200)

		if ($list.is(':visible')) {
			$icon.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2')
		} else {
			$icon.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2')
		}
	})

	// WALIDACJA USTAWIEŃ MARŻY - Live validation
	if ($('input[name="margin_high"]').length) {
		var $marginHigh = $('input[name="margin_high"]')
		var $marginMedium = $('input[name="margin_medium"]')
		var $submitButton = $('input[name="mcpro_save_settings"]')
		var $validationMessage = $(
			'<div class="notice notice-warning inline" style="margin: 10px 0; padding: 10px; display: none;"><p></p></div>'
		)

		// Dodaj komunikat walidacji
		$marginMedium.parent().parent().after($validationMessage)

		function validateMargins() {
			var high = parseInt($marginHigh.val()) || 0
			var medium = parseInt($marginMedium.val()) || 0

			if (high <= 0 || medium <= 0) {
				$validationMessage.find('p').html('<strong>⚠️ Warning:</strong> Margins must be greater than 0%')
				$validationMessage.show()
				$submitButton.prop('disabled', true)
				$marginHigh.css('border-color', '#dc3545')
				$marginMedium.css('border-color', '#dc3545')
				return false
			}

			if (high <= medium) {
				$validationMessage
					.find('p')
					.html(
						'<strong>❌ Error:</strong> High margin (' +
							high +
							'%) must be greater than medium margin (' +
							medium +
							'%)!'
					)
				$validationMessage.show()
				$submitButton.prop('disabled', true)
				$marginHigh.css('border-color', '#dc3545')
				$marginMedium.css('border-color', '#dc3545')
				return false
			}

			// Wszystko OK
			$validationMessage.hide()
			$submitButton.prop('disabled', false)
			$marginHigh.css('border-color', '#28a745')
			$marginMedium.css('border-color', '#28a745')
			return true
		}

		// Waliduj przy każdej zmianie
		$marginHigh.on('input change', validateMargins)
		$marginMedium.on('input change', validateMargins)

		// Waliduj przy załadowaniu strony
		validateMargins()

		// Blokuj submit jeśli walidacja nie przejdzie
		$('form').on('submit', function (e) {
			if (!validateMargins()) {
				e.preventDefault()
				$('html, body').animate(
					{
						scrollTop: $validationMessage.offset().top - 100,
					},
					500
				)
				return false
			}
		})
	}

	// WALIDACJA DLA KATEGORII
	$('input[name^="category_margins"]').on('input change', function () {
		var $row = $(this).closest('tr')
		var $highInput = $row.find('input[name$="[high]"]')
		var $mediumInput = $row.find('input[name$="[medium]"]')

		var high = parseInt($highInput.val()) || 0
		var medium = parseInt($mediumInput.val()) || 0

		// Pomiń jeśli oba puste
		if (high === 0 && medium === 0) {
			$highInput.css('border-color', '')
			$mediumInput.css('border-color', '')
			return
		}

		// Sprawdź czy wysoka > średnia
		if (high > 0 && medium > 0 && high <= medium) {
			$highInput.css('border-color', '#dc3545')
			$mediumInput.css('border-color', '#dc3545')
		} else {
			$highInput.css('border-color', '#28a745')
			$mediumInput.css('border-color', '#28a745')
		}
	})
})
