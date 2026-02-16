"""
Unit tests for notify Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch
from notify import handler


class TestNotifyHandler:
    """Tests for email notification handler"""

    def test_successful_email_notification(self):
        """Test successful email notification"""
        event = {
            'userEmail': 'user@example.com',
            'jobId': 'job-123',
            'fitScore': 85,
            'atsScore': 92,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-abc123'}

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['emailSent'] is True
            assert result['messageId'] == 'msg-abc123'
            assert result['recipient'] == 'user@example.com'

            # Verify SES was called correctly
            mock_ses.send_email.assert_called_once()
            call_kwargs = mock_ses.send_email.call_args.kwargs
            assert call_kwargs['Destination']['ToAddresses'] == ['user@example.com']
            assert '85% Fit' in call_kwargs['Message']['Subject']['Data']

    def test_email_from_environment_variable(self):
        """Test email taken from environment variable when not in event"""
        event = {
            'jobId': 'job-456',
            'fitScore': 75,
            'atsScore': 80,
            'overallRating': 7
        }

        with patch('notify.ses') as mock_ses, \
             patch.dict('os.environ', {'USER_EMAIL': 'env@example.com'}):
            mock_ses.send_email.return_value = {'MessageId': 'msg-xyz'}

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['emailSent'] is True
            assert result['recipient'] == 'env@example.com'

    def test_no_email_skips_notification(self):
        """Test that missing email gracefully skips notification"""
        event = {
            'jobId': 'job-789',
            'fitScore': 90,
            'atsScore': 95,
            'overallRating': 9
        }

        with patch.dict('os.environ', {}, clear=True):
            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['emailSent'] is False
            assert 'No email address' in result['message']

    def test_email_content_includes_scores(self):
        """Test that email content includes all scores"""
        event = {
            'userEmail': 'test@test.com',
            'jobId': 'test-job',
            'fitScore': 88,
            'atsScore': 91,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-123'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs
            body_text = call_kwargs['Message']['Body']['Text']['Data']
            body_html = call_kwargs['Message']['Body']['Html']['Data']

            # Check text body
            assert '88%' in body_text
            assert '91%' in body_text
            assert '8/10' in body_text

            # Check HTML body
            assert '88%' in body_html
            assert '91%' in body_html
            assert '8/10' in body_html

    def test_email_subject_format(self):
        """Test email subject line format"""
        event = {
            'userEmail': 'user@domain.com',
            'jobId': 'job-subject-test',
            'fitScore': 77,
            'atsScore': 85,
            'overallRating': 7
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-subj'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs
            subject = call_kwargs['Message']['Subject']['Data']

            assert subject == 'Resume Analysis Complete - 77% Fit'

    def test_ses_error_handling(self):
        """Test handling of SES errors"""
        event = {
            'userEmail': 'error@test.com',
            'jobId': 'job-err',
            'fitScore': 80,
            'atsScore': 85,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.side_effect = Exception('SES rate limit exceeded')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert result['emailSent'] is False
            assert 'error' in result
            assert 'SES rate limit exceeded' in result['error']

    def test_default_values_for_missing_scores(self):
        """Test that missing scores default to 0"""
        event = {
            'userEmail': 'defaults@test.com',
            'jobId': 'job-defaults'
            # Missing fitScore, atsScore, overallRating
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-defaults'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs
            body_text = call_kwargs['Message']['Body']['Text']['Data']

            # Should use defaults (0)
            assert 'Job Fit Score: 0%' in body_text
            assert 'ATS Compatibility: 0%' in body_text
            assert 'Overall Rating: 0/10' in body_text

    def test_default_job_id(self):
        """Test that missing jobId defaults to Unknown"""
        event = {
            'userEmail': 'jobid@test.com',
            'fitScore': 70,
            'atsScore': 75,
            'overallRating': 7
            # Missing jobId
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-jobid'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs
            body_text = call_kwargs['Message']['Body']['Text']['Data']

            assert 'Job ID: Unknown' in body_text

    def test_email_charset(self):
        """Test that email uses UTF-8 charset"""
        event = {
            'userEmail': 'charset@test.com',
            'jobId': 'job-charset',
            'fitScore': 80,
            'atsScore': 85,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-charset'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs

            assert call_kwargs['Message']['Subject']['Charset'] == 'UTF-8'
            assert call_kwargs['Message']['Body']['Text']['Charset'] == 'UTF-8'
            assert call_kwargs['Message']['Body']['Html']['Charset'] == 'UTF-8'

    def test_source_email_same_as_destination(self):
        """Test that source email is same as destination (verified SES)"""
        event = {
            'userEmail': 'verified@domain.com',
            'jobId': 'job-src',
            'fitScore': 80,
            'atsScore': 85,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-src'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs

            # Source must be verified in SES, using same as destination
            assert call_kwargs['Source'] == 'verified@domain.com'
            assert call_kwargs['Destination']['ToAddresses'] == ['verified@domain.com']

    def test_html_email_structure(self):
        """Test HTML email has proper structure"""
        event = {
            'userEmail': 'html@test.com',
            'jobId': 'job-html',
            'fitScore': 85,
            'atsScore': 90,
            'overallRating': 8
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-html'}

            handler(event, None)

            call_kwargs = mock_ses.send_email.call_args.kwargs
            body_html = call_kwargs['Message']['Body']['Html']['Data']

            # Check HTML structure
            assert '<html>' in body_html
            assert '<head>' in body_html
            assert '<body>' in body_html
            assert '</html>' in body_html
            assert '<h2>Resume Analysis Complete</h2>' in body_html
            assert '<ul>' in body_html
            assert '</ul>' in body_html

    def test_high_score_email(self):
        """Test email with high scores"""
        event = {
            'userEmail': 'success@test.com',
            'jobId': 'job-success',
            'fitScore': 98,
            'atsScore': 100,
            'overallRating': 10
        }

        with patch('notify.ses') as mock_ses:
            mock_ses.send_email.return_value = {'MessageId': 'msg-success'}

            result = handler(event, None)

            assert result['statusCode'] == 200
            call_kwargs = mock_ses.send_email.call_args.kwargs
            subject = call_kwargs['Message']['Subject']['Data']
            assert '98% Fit' in subject
