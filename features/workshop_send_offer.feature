Feature: Workshop sends offer

  Scenario: Workshop owner sends an offer for a new request
    Given I am logged in as a workshop owner
    When I open "Requests" and view nearby opportunities
    And I send an offer for the latest request
    Then I see the offer in "My Active Services"
