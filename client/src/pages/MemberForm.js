import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import './MemberForm.css';

const MemberForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClubId = searchParams.get('clubId');
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    badgeNickname: '',
    suffix: '',
    email: '',
    phone: '',
    phoneType: '',
    streetAddress: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    occupation: '',
    employer: '',
    deceased: false,
    membershipType: 'Full',
    club: queryClubId || user?.clubId || '',
  });
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      fetchMember();
    }
    // Always fetch clubs so we can display the club name as read-only
    fetchClubs();
  }, []);

  const fetchMember = async () => {
    try {
      const response = await apiCall(`/members/${id}`);
      if (!response.ok) throw new Error('Failed to fetch member');
      const data = await response.json();
      setFormData({
        prefix: data.prefix || '',
        middleName: data.middleName || '',
        badgeNickname: data.badgeNickname || '',
        suffix: data.suffix || '',
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        phoneType: data.phoneType || '',
        streetAddress: data.streetAddress || '',
        address2: data.address2 || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        occupation: data.occupation || '',
        employer: data.employer || '',
        deceased: data.deceased || false,
        membershipType: data.membershipType,
        club: data.club._id,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await apiCall('/clubs');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      const data = await response.json();
      setClubs(data);
    } catch (err) {
      console.error('Fetch clubs error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        prefix: formData.prefix || undefined,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        badgeNickname: formData.badgeNickname || undefined,
        suffix: formData.suffix || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        phoneType: formData.phoneType || undefined,
        streetAddress: formData.streetAddress || undefined,
        address2: formData.address2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip: formData.zip || undefined,
        occupation: formData.occupation || undefined,
        employer: formData.employer || undefined,
        deceased: !!formData.deceased,
        membershipType: formData.membershipType,
        club: formData.club,
      };

      const response = await apiCall(
        isEdit ? `/members/${id}` : '/members',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save member');
      }

      navigate(`/club-overview?id=${formData.club}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="form-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>{isEdit ? 'Edit Member' : 'Add Member'}</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="membershipType">Membership Type</label>
            <select id="membershipType" name="membershipType" value={formData.membershipType} onChange={handleChange} disabled={submitting}>
              <option value="Full">Full</option>
              <option value="Associate">Associate</option>
              <option value="Honorary">Honorary</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <fieldset className="form-section">
            <legend>Name</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prefix">Prefix</label>
                <select id="prefix" name="prefix" value={formData.prefix} onChange={handleChange} disabled={submitting}>
                  <option value="">(none)</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="middleName">Middle Name</label>
                <input id="middleName" type="text" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Middle name" disabled={submitting} />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="suffix">Suffix</label>
                <select id="suffix" name="suffix" value={formData.suffix} onChange={handleChange} disabled={submitting}>
                  <option value="">(none)</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="badgeNickname">Badge Nickname</label>
                <input id="badgeNickname" type="text" name="badgeNickname" value={formData.badgeNickname} onChange={handleChange} placeholder="Badge nickname" disabled={submitting} />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Address</legend>
            <div className="form-group">
              <label htmlFor="streetAddress">Street Address</label>
              <input id="streetAddress" name="streetAddress" value={formData.streetAddress} onChange={handleChange} disabled={submitting} />
            </div>

            <div className="form-group">
              <label htmlFor="address2">Additional Address</label>
              <input id="address2" name="address2" value={formData.address2} onChange={handleChange} disabled={submitting} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input id="city" name="city" value={formData.city} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <select id="state" name="state" value={formData.state} onChange={handleChange} disabled={submitting}>
                  <option value="">(none)</option>
                  <option value="AL - Alabama">AL - Alabama</option>
                  <option value="AK - Alaska">AK - Alaska</option>
                  <option value="AZ - Arizona">AZ - Arizona</option>
                  <option value="AR - Arkansas">AR - Arkansas</option>
                  <option value="CA - California">CA - California</option>
                  <option value="CO - Colorado">CO - Colorado</option>
                  <option value="CT - Connecticut">CT - Connecticut</option>
                  <option value="DE - Delaware">DE - Delaware</option>
                  <option value="FL - Florida">FL - Florida</option>
                  <option value="GA - Georgia">GA - Georgia</option>
                  <option value="HI - Hawaii">HI - Hawaii</option>
                  <option value="ID - Idaho">ID - Idaho</option>
                  <option value="IL - Illinois">IL - Illinois</option>
                  <option value="IN - Indiana">IN - Indiana</option>
                  <option value="IA - Iowa">IA - Iowa</option>
                  <option value="KS - Kansas">KS - Kansas</option>
                  <option value="KY - Kentucky">KY - Kentucky</option>
                  <option value="LA - Louisiana">LA - Louisiana</option>
                  <option value="ME - Maine">ME - Maine</option>
                  <option value="MD - Maryland">MD - Maryland</option>
                  <option value="MA - Massachusetts">MA - Massachusetts</option>
                  <option value="MI - Michigan">MI - Michigan</option>
                  <option value="MN - Minnesota">MN - Minnesota</option>
                  <option value="MS - Mississippi">MS - Mississippi</option>
                  <option value="MO - Missouri">MO - Missouri</option>
                  <option value="MT - Montana">MT - Montana</option>
                  <option value="NE - Nebraska">NE - Nebraska</option>
                  <option value="NV - Nevada">NV - Nevada</option>
                  <option value="NH - New Hampshire">NH - New Hampshire</option>
                  <option value="NJ - New Jersey">NJ - New Jersey</option>
                  <option value="NM - New Mexico">NM - New Mexico</option>
                  <option value="NY - New York">NY - New York</option>
                  <option value="NC - North Carolina">NC - North Carolina</option>
                  <option value="ND - North Dakota">ND - North Dakota</option>
                  <option value="OH - Ohio">OH - Ohio</option>
                  <option value="OK - Oklahoma">OK - Oklahoma</option>
                  <option value="OR - Oregon">OR - Oregon</option>
                  <option value="PA - Pennsylvania">PA - Pennsylvania</option>
                  <option value="RI - Rhode Island">RI - Rhode Island</option>
                  <option value="SC - South Carolina">SC - South Carolina</option>
                  <option value="SD - South Dakota">SD - South Dakota</option>
                  <option value="TN - Tennessee">TN - Tennessee</option>
                  <option value="TX - Texas">TX - Texas</option>
                  <option value="UT - Utah">UT - Utah</option>
                  <option value="VT - Vermont">VT - Vermont</option>
                  <option value="VA - Virginia">VA - Virginia</option>
                  <option value="WA - Washington">WA - Washington</option>
                  <option value="WV - West Virginia">WV - West Virginia</option>
                  <option value="WI - Wisconsin">WI - Wisconsin</option>
                  <option value="WY - Wyoming">WY - Wyoming</option>
                  <option value="DC - District of Columbia">DC - District of Columbia</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="zip">Zip Code</label>
                <input id="zip" name="zip" value={formData.zip} onChange={handleChange} disabled={submitting} />
              </div>
            </div>
          </fieldset>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(123) 456-7890" disabled={submitting} />
            </div>

            <div className="form-group">
              <label htmlFor="phoneType">Phone Type</label>
              <select id="phoneType" name="phoneType" value={formData.phoneType} onChange={handleChange} disabled={submitting}>
                <option value="">(none)</option>
                <option value="Home">Home</option>
                <option value="Cell">Cell</option>
                <option value="Work">Work</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="occupation">Occupation</label>
              <input id="occupation" name="occupation" value={formData.occupation} onChange={handleChange} disabled={submitting} />
            </div>
            <div className="form-group">
              <label htmlFor="employer">Employer</label>
              <input id="employer" name="employer" value={formData.employer} onChange={handleChange} disabled={submitting} />
            </div>
            <div className="form-group checkbox-inline">
              <label htmlFor="deceased">Deceased</label>
              <input id="deceased" name="deceased" type="checkbox" className="large-checkbox" checked={formData.deceased} onChange={handleChange} disabled={submitting} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="club">Club *</label>
            <input
              id="club"
              type="text"
              name="club"
              value={(() => {
                const c = clubs.find((cl) => cl._id === formData.club);
                return c ? c.name : '';
              })()}
              readOnly
              disabled
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberForm;
