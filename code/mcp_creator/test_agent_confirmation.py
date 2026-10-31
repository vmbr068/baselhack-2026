import unittest
from unittest.mock import patch

import agent_demo


class ReservationConfirmationTests(unittest.TestCase):
    @patch("agent_demo.Prompt.ask", return_value="cancel")
    def test_booking_requires_explicit_confirmation(self, ask):
        self.assertFalse(agent_demo.confirm_reservation({"room_title": "Fictional Suite"}))
        ask.assert_called_once_with(
            "Type 'confirm' to submit this fictional booking",
            choices=["confirm", "cancel"],
            default="cancel",
        )

    @patch("agent_demo.Prompt.ask", return_value="confirm")
    def test_explicit_confirmation_allows_booking(self, ask):
        self.assertTrue(agent_demo.confirm_reservation({"room_title": "Fictional Suite"}))


if __name__ == "__main__":
    unittest.main()
